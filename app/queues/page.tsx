'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type Message = {
  id: string;
  content: string;
  queueName: string;
  timestamp: number;
};

type QueueStats = {
  name: string;
  messageCount: number;
  messages: Message[];
  metadata: QueueMetadata;
};

const GRID_GAP = 6;
const HEADER_HEIGHT = 96;
const PADDING_X = 32;
const PADDING_Y = 24;
const DETAIL_WIDTH = 360;
const FLEX_GAP = 24;
const CARD_INNER_PADDING_X = 48;
const CARD_INNER_PADDING_Y = 44;
const CARD_HEADER_HEIGHT = 64;
const MIN_GRID_EDGE = 200;
const BASE_TIMESTAMP = 1_725_000_000_000;

const JOB_NAMES = [
  'daily-report',
  'onboarding',
  'retention',
  'outreach',
  'verification',
] as const;

const CAMPAIGN_NAMES = [
  'campaign-alpha',
  'campaign-bravo',
  'campaign-echo',
  'campaign-lima',
  'campaign-nova',
  'campaign-sigma',
] as const;

const BOOSTER_NAMES = [
  'booster-a',
  'booster-b',
  'booster-c',
  'booster-d',
] as const;

const MASS_REPORT_STATES = [
  'scheduled',
  'in-progress',
  'on-hold',
  'complete',
  'not-applicable',
] as const;

type QueueMetadata = {
  job: string;
  campaign: string;
  booster: string;
  massReport: string;
};

type MockDataset = {
  messages: Message[];
  queueMetadata: Map<string, QueueMetadata>;
};

type SearchField = 'job' | 'campaign' | 'booster' | 'massReport';

const SEARCH_FIELDS: {
  value: SearchField;
  label: string;
}[] = [
  { value: 'job', label: 'job' },
  { value: 'campaign', label: 'campaign' },
  { value: 'booster', label: 'booster' },
  { value: 'massReport', label: 'mass report' },
];

const pseudoRandom = (seed: number) => {
  const value = Math.sin(seed) * 10000;
  return value - Math.floor(value);
};

const formatTimestamp = (value: number) =>
  new Date(value).toISOString().slice(11, 19);

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;
  return `${mins}m`;
};

const pickFromList = <T extends readonly string[]>(
  list: T,
  seed: number,
): T[number] => {
  const index = Math.floor(pseudoRandom(seed) * list.length);
  return list[index];
};

const createQueueMetadata = (queueIndex: number): QueueMetadata => ({
  job: pickFromList(JOB_NAMES, queueIndex),
  campaign: pickFromList(CAMPAIGN_NAMES, queueIndex + 17),
  booster: pickFromList(BOOSTER_NAMES, queueIndex + 31),
  massReport: pickFromList(MASS_REPORT_STATES, queueIndex + 47),
});

const generateMockData = (): MockDataset => {
  const messages: Message[] = [];
  const queueMetadata = new Map<string, QueueMetadata>();
  const queueCount = 1000;

  for (let q = 1; q <= queueCount; q++) {
    const queueName = `queue-${q}`;
    queueMetadata.set(queueName, createQueueMetadata(q));
    const messageCount = Math.floor(pseudoRandom(q) * 50) + 5;
    for (let m = 0; m < messageCount; m++) {
      const seed = q * 1000 + m;
      messages.push({
        id: `q${q}-msg-${1000 + m}`,
        content: `Task ${m + 1} for queue ${q}`,
        queueName,
        timestamp: BASE_TIMESTAMP - Math.floor(pseudoRandom(seed) * 3600000),
      });
    }
  }

  return { messages, queueMetadata };
};

const computeGridLayout = (
  width: number,
  height: number,
  itemCount: number,
  gap: number,
) => {
  if (itemCount === 0) {
    return { columns: 0, rows: 0, cellSize: 0 };
  }

  let best = { columns: 1, rows: itemCount, cellSize: 0 };

  for (let columns = 1; columns <= itemCount; columns++) {
    const rows = Math.ceil(itemCount / columns);
    const cellWidth = (width - (columns - 1) * gap) / columns;
    const cellHeight = (height - (rows - 1) * gap) / rows;
    const size = Math.floor(Math.min(cellWidth, cellHeight));

    if (size <= 0) continue;

    if (size > best.cellSize) {
      best = { columns, rows, cellSize: size };
    }
  }

  return best;
};

export default function QueuesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQueue, setSelectedQueue] = useState<QueueStats | null>(null);
  const [searchField, setSearchField] = useState<SearchField>('job');
  const [messageQuery, setMessageQuery] = useState('');
  const [mockData] = useState<MockDataset>(generateMockData);
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const queueStats = useMemo((): QueueStats[] => {
    const grouped = new Map<string, Message[]>();

    mockData.messages.forEach((msg) => {
      const existing = grouped.get(msg.queueName) || [];
      existing.push(msg);
      grouped.set(msg.queueName, existing);
    });

    return Array.from(grouped.entries()).map(([name, messages]) => ({
      name,
      messageCount: messages.length,
      messages: messages
        .slice()
        .sort((a, b) => a.timestamp - b.timestamp),
      metadata: mockData.queueMetadata.get(name)!,
    }));
  }, [mockData]);

  const matchesQueue = useCallback(
    (queue: QueueStats): boolean => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;

      const fieldValue = queue.metadata[searchField];
      return fieldValue.toLowerCase().includes(query);
    },
    [searchField, searchQuery],
  );

  const filteredQueues = useMemo(
    () => queueStats.filter((queue) => matchesQueue(queue)),
    [matchesQueue, queueStats],
  );

  useEffect(() => {
    if (
      selectedQueue &&
      !filteredQueues.some((queue) => queue.name === selectedQueue.name)
    ) {
      setSelectedQueue(null);
    }
  }, [filteredQueues, selectedQueue]);

  useEffect(() => {
    setMessageQuery('');
  }, [selectedQueue]);

  const selectedJobType = useMemo(() => {
    if (!selectedQueue) return null;
    const { metadata } = selectedQueue;
    if (metadata.massReport && metadata.massReport !== 'not-applicable') {
      return `mass report: ${metadata.massReport}`;
    }
    if (metadata.campaign) {
      return `campaign: ${metadata.campaign}`;
    }
    if (metadata.booster) {
      return `booster: ${metadata.booster}`;
    }
    return null;
  }, [selectedQueue]);

  const visibleMessages = useMemo(() => {
    if (!selectedQueue) return [];
    const query = messageQuery.trim().toLowerCase();
    if (!query) return selectedQueue.messages;

    const { campaign, booster, massReport } = selectedQueue.metadata;
    const metaValues = [campaign, booster, massReport].map((value) =>
      value.toLowerCase(),
    );

    return selectedQueue.messages.filter((message) => {
      if (message.id.toLowerCase().includes(query)) return true;
      return metaValues.some((value) => value.includes(query));
    });
  }, [messageQuery, selectedQueue]);

  const maxMessageCount = useMemo(
    () =>
      queueStats.reduce(
        (max, queue) => Math.max(max, queue.messageCount),
        0,
      ),
    [queueStats],
  );

  const { columns, cellSize } = useMemo(
    () =>
      dimensions
        ? (() => {
            const widthWithoutChrome =
              dimensions.width - DETAIL_WIDTH - PADDING_X * 2 - FLEX_GAP;
            const heightWithoutChrome =
              dimensions.height - HEADER_HEIGHT - PADDING_Y * 2;

            const gridWidth = Math.max(
              widthWithoutChrome - CARD_INNER_PADDING_X,
              MIN_GRID_EDGE,
            );
            const gridHeight = Math.max(
              heightWithoutChrome - CARD_INNER_PADDING_Y - CARD_HEADER_HEIGHT,
              MIN_GRID_EDGE,
            );

            return computeGridLayout(
              gridWidth,
              gridHeight,
              filteredQueues.length,
              GRID_GAP,
            );
          })()
        : { columns: 0, rows: 0, cellSize: 0 },
    [dimensions, filteredQueues.length],
  );

  const accentColor = '#3b82f6';
  const activeFieldLabel =
    SEARCH_FIELDS.find((option) => option.value === searchField)?.label ??
    searchField;

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className="fixed inset-0 overflow-hidden"
        style={{
          background: `radial-gradient(circle at 20% 20%, ${accentColor}40 0%, transparent 40%),
             radial-gradient(circle at 80% 80%, ${accentColor}35 0%, transparent 40%),
             radial-gradient(ellipse at 50% 0%, ${accentColor}25 0%, transparent 50%),
             radial-gradient(ellipse at 50% 100%, ${accentColor}20 0%, transparent 50%),
             linear-gradient(180deg, ${accentColor}12 0%, #0b0f14 30%, #0b0f14 70%, ${accentColor}12 100%)`,
        }}
      >
        <div className="absolute inset-0 pointer-events-none opacity-30" />
        <div className="relative z-10 flex h-full flex-col">
          <header className="flex items-center justify-between gap-4 px-8 py-6">
            <div className="flex flex-1 items-center gap-3">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={`search by ${activeFieldLabel}`}
                className="h-10 w-full max-w-md rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/60"
              />
              <div className="inline-flex rounded-md border border-white/10 bg-white/5 p-1">
                {SEARCH_FIELDS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSearchField(option.value)}
                    className={`rounded-sm px-2 py-1 text-xs font-medium transition ${
                      searchField === option.value
                        ? 'bg-sky-500/80 text-white shadow'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-xs text-white/60">
              showing {filteredQueues.length} of {queueStats.length} queues
            </div>
          </header>

          <div className="flex flex-1 min-h-0 gap-6 px-8 pb-6">
            <div className="flex-1 min-w-0 min-h-0">
              <div className="flex h-full min-h-0 flex-col overflow-visible rounded-2xl border border-white/10 bg-black/30 shadow-lg backdrop-blur">
                <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
                  <div className="text-sm font-semibold text-white/80">
                    queues overview
                  </div>
                  <div className="text-xs text-white/50">
                    {filteredQueues.length.toLocaleString()} queues
                  </div>
                </div>
                <div className="relative flex-1 min-h-0 overflow-y-auto scroll-elegant px-6 pb-6 pt-5">
                  {!dimensions ? (
                    <div className="flex h-full items-center justify-center text-sm font-medium text-white/60">
                      sizing layout...
                    </div>
                  ) : filteredQueues.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm font-medium text-white/60">
                      no queues match that search
                    </div>
                  ) : (
                    <div
                      className="grid mx-auto"
                      style={{
                        gap: `${GRID_GAP}px`,
                        gridTemplateColumns: `repeat(${columns}, minmax(0, ${cellSize}px))`,
                        gridAutoRows: `${cellSize}px`,
                        alignContent: 'start',
                        justifyContent: 'center',
                      }}
                    >
                      {filteredQueues.map((queue) => {
                        const isSelected = selectedQueue?.name === queue.name;
                        const hasMatch =
                          Boolean(searchQuery.trim()) && matchesQueue(queue);
                        const intensity = maxMessageCount
                          ? queue.messageCount / maxMessageCount
                          : 0;
                        const highlight = hasMatch ? '#f87171' : '#facc15';
                        const fillOpacity = Math.max(
                          0.35,
                          Math.min(0.9, intensity * 0.75 + 0.25),
                        );

                        return (
                          <Tooltip key={queue.name}>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedQueue(queue);
                                  setMessageQuery('');
                                }}
                                className={`relative flex h-full w-full items-center justify-center rounded-lg border transition ${
                                  isSelected
                                    ? 'border-sky-400 ring-2 ring-sky-400/40'
                                    : 'border-white/10 hover:border-white/30'
                                }`}
                                style={{
                                  backgroundColor: `${highlight}${Math.round(
                                    fillOpacity * 255,
                                  )
                                    .toString(16)
                                    .padStart(2, '0')}`,
                                }}
                              >
                                <div className="absolute inset-1 rounded-md border border-white/10 bg-black/10" />
                                <span className="relative text-[11px] font-semibold text-slate-950 drop-shadow">
                                  {queue.messageCount}
                                </span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <div className="space-y-1 text-left">
                                <div className="text-xs font-semibold">
                                  {queue.name}
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                  {queue.messageCount} messages
                                </div>
                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                  {queue.metadata.job}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  est. completion{' '}
                                  {formatDuration(queue.messageCount * 20)}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <aside className="w-[360px] shrink-0 min-h-0">
              {selectedQueue ? (
                <div className="flex h-full min-h-0 flex-col rounded-2xl border border-white/10 bg-black/50 p-6 shadow-xl backdrop-blur">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-white">
                        {selectedQueue.name}
                      </div>
                      <div className="text-xs text-white/60">
                        {selectedQueue.messageCount} messages total
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedQueue(null)}
                      className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium text-white/70 transition hover:border-white/30 hover:text-white"
                    >
                      close
                    </button>
                  </div>
                  <div className="mt-4">
                    <input
                      value={messageQuery}
                      onChange={(event) => setMessageQuery(event.target.value)}
                      placeholder="search messages"
                      className="h-9 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/60"
                    />
                  </div>
                  <div className="mt-6 flex-1 overflow-y-auto scroll-elegant pr-1">
                    <div className="space-y-3">
                      {visibleMessages.map((message, index) => (
                        <div
                          key={message.id}
                          className="rounded-xl border border-white/10 bg-gradient-to-br from-white/8 via-white/5 to-transparent p-4 shadow-sm transition hover:border-white/30"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono text-white">
                              {message.id}
                            </span>
                            <span className="text-[10px] uppercase tracking-wide text-white/50">
                              {formatTimestamp(message.timestamp)}
                            </span>
                          </div>
                          {selectedJobType ? (
                            <div className="mt-3 text-[10px] uppercase tracking-wide text-white/60">
                              {selectedJobType}
                            </div>
                          ) : null}
                          <div className="mt-3 text-[10px] uppercase tracking-wide text-white/50">
                            message {index + 1} / {visibleMessages.length}
                          </div>
                        </div>
                      ))}
                      {visibleMessages.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-4 text-center text-xs text-white/50">
                          no messages match that search
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-white/50">
                  pick a queue to see message history
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
