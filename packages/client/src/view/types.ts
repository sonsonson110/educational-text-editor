export type ViewLine = {
  lineNumber: number;
  content: string;
};

export const TOP_PADDING_RESERVATION_KEYS = {
  REMOTE_CURSOR_LINE_0: "remote-cursor-line0",
} as const;

export type TopPaddingReservationKey = typeof TOP_PADDING_RESERVATION_KEYS[keyof typeof TOP_PADDING_RESERVATION_KEYS];
