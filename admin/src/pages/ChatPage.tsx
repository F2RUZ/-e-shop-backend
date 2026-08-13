import { useEffect, useMemo, useRef, useState } from 'react';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { Socket } from 'socket.io-client';
import { errorMessage } from '../api/client';
import { chatApi } from '../api/endpoints';
import { CHAT_EVENTS, CLIENT_CHAT_PAGE, createChatSocket } from '../api/socket';
import type { Chat, ChatMessage } from '../api/types';
import { PageHeader } from '../components/layout/PageHeader';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { EmptyState } from '../components/ui/EmptyState';
import { TableToolbar } from '../components/ui/TableToolbar';
import { formatTime } from '../lib/format';
import { useToast } from '../providers/ToastProvider';

/** Suhbatlar ro'yxati react-query'da yashaydi — WebSocket uni yangilab turadi. */
const CHATS_KEY = ['chat', 'chats'];

export default function ChatPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const qc = useQueryClient();
  const { toast } = useToast();

  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [guestTyping, setGuestTyping] = useState(false);
  const [connected, setConnected] = useState(false);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<Chat | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  /**
   * ⚠️ `activeId` ni REF'da ham saqlaymiz.
   *
   * Sabab: `socket.on(...)` faqat BIR MARTA (useEffect ichida) yoziladi.
   * O'sha funksiya ichida oddiy `activeId` o'zgaruvchisi eski qiymatda
   * qotib qoladi (stale closure). Ref esa doim yangi qiymatni ko'rsatadi.
   */
  const activeIdRef = useRef<number | null>(null);

  // ── Birinchi ochilishda ro'yxatni HTTP orqali olamiz ─────────────────
  const chatsQuery = useQuery({ queryKey: CHATS_KEY, queryFn: () => chatApi.list() });
  const chats = chatsQuery.data ?? [];

  // ══════════════════════════════════════════════════════════════════
  //  WebSocket — bir marta ulanadi, sahifadan chiqilganda uziladi
  // ══════════════════════════════════════════════════════════════════
  useEffect(() => {
    const socket = createChatSocket();
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    // Suhbatlar ro'yxati o'zgardi — react-query'dagi ma'lumotni almashtiramiz.
    // Qayta so'rov yubormaymiz: kerakli ro'yxat allaqachon kelib turibdi.
    socket.on(CHAT_EVENTS.CHATS, (payload: { chats: Chat[] }) => {
      qc.setQueryData(CHATS_KEY, payload.chats);
    });

    // `chat:join` javobi — eski yozishmalar
    socket.on(CHAT_EVENTS.HISTORY, (payload: { chatId: number; messages: ChatMessage[] }) => {
      if (payload.chatId !== activeIdRef.current) return;
      setMessages(payload.messages);
    });

    // Yangi xabar. O'zimiz yuborgani ham SHU YERGA qaytadi —
    // shuning uchun yuborayotganda ro'yxatga qo'lda qo'shmaymiz.
    socket.on(CHAT_EVENTS.MESSAGE, (message: ChatMessage) => {
      if (message.chatId !== activeIdRef.current) return;

      setMessages((list) => [...list, message]);
      setGuestTyping(false);

      // Suhbat ochiq turibdi — demak o'qildi
      if (message.sender === 'guest') {
        socket.emit(CHAT_EVENTS.READ, { chatId: message.chatId });
      }
    });

    socket.on(CHAT_EVENTS.TYPING, (payload: { chatId: number; isTyping: boolean }) => {
      if (payload.chatId !== activeIdRef.current) return;
      setGuestTyping(payload.isTyping);
    });

    // Backend xatolik matnlari o'zbekcha — o'zgartirmasdan ko'rsatamiz
    socket.on(CHAT_EVENTS.ERROR, (payload: { message: string }) => toast(payload.message, 'error'));

    // ⚠️ Tozalash MAJBURIY: bo'lmasa har renderda yangi ulanish qo'shilib,
    // xabarlar bir necha marta ko'rinib qoladi.
    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [qc, toast]);

  // Yangi xabar kelganda pastga tushamiz
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, guestTyping]);

  // ══════════════════════════════════════════════════════════════════
  //  Amallar
  // ══════════════════════════════════════════════════════════════════

  const openChat = (chat: Chat) => {
    activeIdRef.current = chat.id;
    setActiveId(chat.id);
    setMessages([]);
    setGuestTyping(false);
    setText('');

    // Server eski xonadan o'zi chiqaradi va javobiga `chat:history` yuboradi
    socketRef.current?.emit(CHAT_EVENTS.JOIN, { chatId: chat.id });
  };

  const send = () => {
    const value = text.trim();
    if (!value || !activeId) return;

    socketRef.current?.emit(CHAT_EVENTS.MESSAGE, { chatId: activeId, text: value });
    setText('');
    sendTyping(false);
  };

  // ── «yozmoqda…» ────────────────────────────────────────────────────
  // Har harfda hodisa yubormaymiz: bir marta "boshladim", 1.5 soniya
  // jimlikdan keyin "tugatdim".
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingSent = useRef(false);

  const sendTyping = (isTyping: boolean) => {
    if (!activeId || typingSent.current === isTyping) return;

    typingSent.current = isTyping;
    socketRef.current?.emit(CHAT_EVENTS.TYPING, { chatId: activeId, isTyping });
  };

  const onType = (value: string) => {
    setText(value);
    sendTyping(true);

    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendTyping(false), 1500);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => chatApi.remove(id),
    onSuccess: (res, id) => {
      toast(res.message);
      setDeleting(null);
      if (activeId === id) {
        activeIdRef.current = null;
        setActiveId(null);
        setMessages([]);
      }
      // Ro'yxat WebSocket orqali ham keladi, lekin so'rovni ham yangilaymiz
      void qc.invalidateQueries({ queryKey: CHATS_KEY });
    },
    onError: (e) => {
      const msg = errorMessage(e, t('error.unknown'));
      toast(msg === 'network' ? t('error.network') : msg, 'error');
      setDeleting(null);
    },
  });

  // ══════════════════════════════════════════════════════════════════
  //  Ko'rinish
  // ══════════════════════════════════════════════════════════════════

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter(
      (c) =>
        c.guestName.toLowerCase().includes(q) || (c.lastMessage ?? '').toLowerCase().includes(q),
    );
  }, [chats, search]);

  const active = chats.find((c) => c.id === activeId) ?? null;

  return (
    <>
      <PageHeader
        kickerKey="chat.kicker"
        titleKey="chat.title"
        descriptionKey="chat.subtitle"
        icon={<ChatRoundedIcon />}
        actions={
          <Button
            variant="soft"
            startIcon={<OpenInNewRoundedIcon />}
            component="a"
            href={CLIENT_CHAT_PAGE}
            target="_blank"
            rel="noreferrer"
          >
            {t('chat.openClientPage')}
          </Button>
        }
      />

      <Paper
        variant="glass"
        sx={{
          display: 'flex',
          overflow: 'hidden',
          height: { xs: 'calc(100dvh - 230px)', md: 'calc(100dvh - 250px)' },
          minHeight: 420,
        }}
      >
        {/* ── Chap ustun: suhbatlar ro'yxati ────────────────────── */}
        <Box
          sx={{
            width: { xs: '100%', md: 320 },
            flexShrink: 0,
            display: { xs: activeId ? 'none' : 'flex', md: 'flex' },
            flexDirection: 'column',
            borderRight: { md: '1px solid var(--border)' },
            minWidth: 0,
          }}
        >
          <Box sx={{ p: 1.5, pb: 0 }}>
            <TableToolbar
              search={search}
              onSearch={setSearch}
              searchPlaceholderKey="chat.searchPlaceholder"
            />
          </Box>

          <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, pb: 1.5 }}>
            {rows.length === 0 ? (
              <EmptyState
                titleKey={search ? 'empty.search' : 'chat.empty'}
                descriptionKey={search ? 'empty.searchHint' : 'chat.emptyHint'}
                icon={<ChatRoundedIcon />}
              />
            ) : (
              <Stack spacing={0.5}>
                {rows.map((chat) => (
                  <ChatListItem
                    key={chat.id}
                    chat={chat}
                    lang={lang}
                    selected={chat.id === activeId}
                    onOpen={() => openChat(chat)}
                    onDelete={() => setDeleting(chat)}
                  />
                ))}
              </Stack>
            )}
          </Box>
        </Box>

        {/* ── O'ng ustun: yozishuv ──────────────────────────────── */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: { xs: activeId ? 'flex' : 'none', md: 'flex' },
            flexDirection: 'column',
          }}
        >
          {!active ? (
            <Box sx={{ m: 'auto', textAlign: 'center', px: 3 }}>
              <ChatRoundedIcon sx={{ fontSize: 40, color: 'var(--muted-foreground)' }} />
              <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                {t('chat.selectHint')}
              </Typography>
            </Box>
          ) : (
            <>
              {/* Sarlavha */}
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ p: 1.5, borderBottom: '1px solid var(--border)' }}
              >
                <IconButton
                  size="small"
                  onClick={() => {
                    activeIdRef.current = null;
                    setActiveId(null);
                  }}
                  sx={{ display: { md: 'none' } }}
                  aria-label={t('common.close')}
                >
                  <ArrowBackRoundedIcon fontSize="small" />
                </IconButton>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" noWrap>
                    {active.guestName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {guestTyping
                      ? t('chat.guestTyping')
                      : connected
                        ? t('chat.connected')
                        : t('chat.disconnected')}
                  </Typography>
                </Box>

                <Box
                  aria-hidden
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: connected ? 'var(--success)' : 'var(--muted-foreground)',
                  }}
                />

                <Tooltip title={t('common.delete')}>
                  <IconButton
                    size="small"
                    onClick={() => setDeleting(active)}
                    sx={{ color: 'var(--destructive)' }}
                  >
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>

              {/* Xabarlar */}
              <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
                {messages.length === 0 ? (
                  <Typography
                    variant="body2"
                    sx={{ color: 'text.secondary', textAlign: 'center', mt: 4 }}
                  >
                    {t('chat.noMessages')}
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {messages.map((m) => (
                      <Bubble key={m.id} message={m} lang={lang} />
                    ))}
                  </Stack>
                )}

                {guestTyping && (
                  <Typography variant="caption" sx={{ color: 'text.secondary', pl: 0.5 }}>
                    {t('chat.guestTyping')}
                  </Typography>
                )}

                <div ref={bottomRef} />
              </Box>

              {/* Yozish maydoni */}
              <Stack
                component="form"
                direction="row"
                spacing={1}
                sx={{ p: 1.5, borderTop: '1px solid var(--border)' }}
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <TextField
                  size="small"
                  fullWidth
                  value={text}
                  onChange={(e) => onType(e.target.value)}
                  placeholder={t('chat.placeholder')}
                  slotProps={{ htmlInput: { maxLength: 1000, 'aria-label': t('chat.placeholder') } }}
                  autoComplete="off"
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!text.trim() || !connected}
                  sx={{ minWidth: 0, px: 2 }}
                  aria-label={t('chat.send')}
                >
                  <SendRoundedIcon fontSize="small" />
                </Button>
              </Stack>
            </>
          )}
        </Box>
      </Paper>

      <ConfirmModal
        open={!!deleting}
        titleKey="chat.deleteTitle"
        text={t('chat.deleteText', { name: deleting?.guestName ?? '' })}
        loading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}

// ────────────────────────── Ro'yxatdagi bitta qator ──────────────────

interface ItemProps {
  chat: Chat;
  lang: string;
  selected: boolean;
  onOpen: () => void;
  onDelete: () => void;
}

function ChatListItem({ chat, lang, selected, onOpen, onDelete }: ItemProps) {
  const { t } = useTranslation();

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{
        p: 1,
        borderRadius: 'var(--radius-lg)',
        cursor: 'pointer',
        background: selected ? 'color-mix(in oklab, var(--primary) 14%, transparent)' : 'transparent',
        '&:hover': { background: 'color-mix(in oklab, var(--accent) 50%, transparent)' },
        '&:hover .chat-delete': { opacity: 1 },
      }}
      role="button"
      tabIndex={0}
      aria-label={chat.guestName}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <Badge
        badgeContent={chat.unreadForAdmin}
        color="primary"
        overlap="circular"
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box
          aria-hidden
          sx={{
            width: 38,
            height: 38,
            display: 'grid',
            placeItems: 'center',
            borderRadius: '50%',
            fontWeight: 700,
            color: 'var(--primary)',
            background: 'color-mix(in oklab, var(--primary) 18%, transparent)',
          }}
        >
          {chat.guestName.slice(0, 1).toUpperCase()}
        </Box>
      </Badge>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {chat.guestName}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap display="block">
          {chat.lastMessage ?? t('chat.noMessagesYet')}
        </Typography>
      </Box>

      {chat.lastMessageAt && (
        <Typography variant="caption" className="tabular" sx={{ color: 'text.secondary' }}>
          {formatTime(chat.lastMessageAt, lang)}
        </Typography>
      )}

      <Tooltip title={t('common.delete')}>
        <IconButton
          size="small"
          className="chat-delete"
          sx={{ opacity: 0, transition: 'opacity .15s ease', color: 'var(--destructive)' }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <DeleteOutlineRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

// ─────────────────────────────── Xabar ───────────────────────────────

function Bubble({ message, lang }: { message: ChatMessage; lang: string }) {
  // 'admin' — bu biz. Demak o'ng tarafda.
  const mine = message.sender === 'admin';

  return (
    <Box
      sx={{
        alignSelf: mine ? 'flex-end' : 'flex-start',
        maxWidth: '78%',
        px: 1.5,
        py: 1,
        borderRadius: 'var(--radius-xl)',
        background: mine
          ? 'color-mix(in oklab, var(--primary) 22%, transparent)'
          : 'color-mix(in oklab, var(--accent) 60%, transparent)',
        border: '1px solid var(--border)',
      }}
    >
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {message.text}
      </Typography>
      <Typography
        variant="caption"
        className="tabular"
        sx={{ display: 'block', mt: 0.25, color: 'text.secondary' }}
      >
        {formatTime(message.createdAt, lang)}
      </Typography>
    </Box>
  );
}
