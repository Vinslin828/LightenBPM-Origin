export const gridSx = {
  "--grid-border": "#e4e4e7",
  "--grid-header-bg": "var(--color-gray-2)",
  "--grid-text": "rgba(17, 25, 40, 0.9)",
  "--grid-scroll-thumb": "#d1d5db",
  "--grid-horizontal-scrollbar-size": "12px",
  border: "1px solid var(--grid-border)",
  borderRadius: "6px",
  backgroundColor: "white",
  color: "var(--grid-text)",
  overflow: "hidden",
  "& .MuiDataGrid-columnHeaders": {
    minHeight: "56px !important",
    maxHeight: "56px !important",
    backgroundColor: "#F3F4F6",
    borderBottom: "1px solid var(--grid-border)",
  },
  "& .MuiDataGrid-columnHeader": {
    padding: "16px",
    backgroundColor: "var(--grid-header-bg)",
    borderColor: "var(--color-stroke)",
  },
  "& .MuiDataGrid-columnHeader.MuiDataGrid-withBorderColor": {
    borderColor: "var(--color-stroke)",
  },
  "& .MuiDataGrid-columnHeaderTitle": {
    fontFamily: "Roboto, sans-serif",
    fontSize: 14,
    lineHeight: "24px",
    fontWeight: 500,
    letterSpacing: "-0.01em",
    color: "var(--grid-text)",
  },
  "& .MuiDataGrid-columnSeparator": {
    visibility: "visible",
    opacity: 1,
    color: "var(--grid-border)",
    cursor: "col-resize",
  },
  "& .MuiDataGrid-iconSeparator": {
    display: "block",
  },
  "& .MuiDataGrid-row": {
    borderBottom: "1px solid var(--grid-border)",
    boxShadow: "none",
  },
  '& .MuiDataGrid-row--lastVisible > .MuiDataGrid-cell:first-of-type, & .MuiDataGrid-row--lastVisible > .MuiDataGrid-cell[data-colindex="0"]':
    {
      borderBottomLeftRadius: "6px !important",
    },
  '& .MuiDataGrid-row--lastVisible > .MuiDataGrid-cell:last-of-type, & .MuiDataGrid-row--lastVisible > .MuiDataGrid-cell[data-colindex="0"]':
    {
      borderBottomLeftRadius: "6px !important",
    },
  "& .MuiDataGrid-cell": {
    borderBottom: "none",
    padding: "16px",
    fontFamily: "Roboto, sans-serif",
    fontSize: 14,
    lineHeight: "20px",
    fontWeight: 400,
    letterSpacing: "-0.01em",
    color: "var(--grid-text)",
  },
  "& .MuiDataGrid-row > .MuiDataGrid-cellEmpty, & .MuiDataGrid-cellEmpty, & .MuiDataGrid-filler":
    {
      display: "none !important",
      width: "0 !important",
      minWidth: "0 !important",
      maxWidth: "0 !important",
      padding: "0 !important",
      border: "0 !important",
      flex: "0 0 0 !important",
    },
  "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus-within":
    {
      outline: "none",
    },
  "& .MuiDataGrid-cell--editing": {
    boxSizing: "border-box",
    outline: "none !important",
    outlineOffset: "0 !important",
    overflow: "visible",
  },
  "& .MuiDataGrid-cell--editing:focus-within": {
    outline: "none !important",
    outlineOffset: "0 !important",
  },
  "& .MuiDataGrid-cell.MuiDataGrid-cell--editing:focus-within": {
    outline: "none !important",
    outlineOffset: "0 !important",
  },
  "& .MuiDataGrid-cell.grid-cell-error": {
    boxSizing: "border-box",
    outline: "1px solid #ef4444 !important",
    outlineOffset: "-1px !important",
  },
  "& .MuiDataGrid-cell.grid-cell-error:hover, & .MuiDataGrid-cell.grid-cell-error:focus, & .MuiDataGrid-cell.grid-cell-error:focus-within":
    {
      outline: "1px solid #ef4444 !important",
      outlineOffset: "-1px !important",
    },
  "& .MuiDataGrid-cell.MuiDataGrid-cell--editing.grid-cell-error, & .MuiDataGrid-cell.MuiDataGrid-cell--editing.grid-cell-error:focus-within":
    {
      outline: "1px solid #ef4444 !important",
      outlineOffset: "-1px !important",
    },
  "& .MuiDataGrid-virtualScroller": {
    paddingBottom: "var(--grid-horizontal-scrollbar-size)",
    boxSizing: "border-box",
  },
  "& .MuiDataGrid-scrollbar--horizontal": {
    backgroundColor: "var(--grid-header-bg)",
    borderTop: "1px solid var(--grid-border)",
    minHeight: "var(--grid-horizontal-scrollbar-size)",
    maxHeight: "var(--grid-horizontal-scrollbar-size)",
  },
  "& .MuiDataGrid-scrollbar--horizontal .MuiDataGrid-scrollbarContent": {
    minHeight: 12,
  },
  "& .MuiDataGrid-scrollbar--horizontal::-webkit-scrollbar": {
    height: 12,
  },
  "& .MuiDataGrid-scrollbar--horizontal::-webkit-scrollbar-thumb": {
    backgroundColor: "var(--grid-scroll-thumb)",
    borderRadius: 9999,
  },
  "& .MuiDataGrid-toolbarContainer": {
    padding: "8px 12px",
    borderBottom: "1px solid var(--grid-border)",
  },
  "& .MuiDataGrid-cell.grid-cell-expression": {
    backgroundColor: "var(--color-gray-2)",
    cursor: "default",
  },
  "& .MuiDataGrid-row:hover .MuiDataGrid-cell.grid-cell-expression": {
    backgroundColor: "var(--color-gray-2)",
  },
} as const;
