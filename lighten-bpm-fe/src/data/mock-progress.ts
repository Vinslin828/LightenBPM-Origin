import {
  ReviewStatus,
  ProgressStatus,
  ProgressType,
  Progress,
} from "@/types/application";

const MOCK_CONDITION: Progress[] = [
  [
    {
      id: "3-1",
      title: "Budget review",
      type: ProgressType.Group,
      status: ProgressStatus.Pending,
      method: "OR",
      children: [
        {
          title: "Low-level check",
          isReportingLine: true,
          data: [
            {
              id: "rr1",
              type: "user",
              assigneeName: "Ronal Richard",
              status: ReviewStatus.Pending,
            },
            {
              id: "rr2",
              type: "user",
              title: "Low level check",
              assigneeName: "Ronal Richard",
              status: ReviewStatus.Pending,
            },
          ],
        },
        {
          title: "Mid-level check",
          isReportingLine: true,
          data: [
            {
              id: "ja",
              type: "user",
              title: "Low level check",
              assigneeName: "Jane Austin",
              status: ReviewStatus.Pending,
            },
          ],
        },
        {
          title: "High-level check",
          isReportingLine: true,
          data: [
            {
              id: "hr",
              type: "department",
              assigneeName: "HR",
              status: ReviewStatus.Pending,
            },
          ],
        },
      ],
    },
  ],
  [
    {
      id: "3-2-1",
      title: "Purchasing review",
      type: ProgressType.Review,
      status: ProgressStatus.Pending,
      isReportingLine: true,
      children: [
        {
          id: "rr3",
          type: "user",
          assigneeName: "Ronal Richard",
          status: ReviewStatus.Pending,
        },
      ],
    },
    {
      id: "3-2-2",
      title: "Legal check",
      type: ProgressType.Review,
      status: ProgressStatus.NotStarted,
      isReportingLine: true,
      children: [
        {
          id: "rr4",
          type: "user",
          assigneeName: "Ronal Richard",
          status: ReviewStatus.Pending,
        },
      ],
    },
  ],
  [
    {
      id: "3-3",
      title: "IT review",
      type: ProgressType.Review,
      status: ProgressStatus.Pending,
      isReportingLine: true,
      children: [
        {
          id: "rr5",
          assigneeName: "IT",
          type: "department",
          status: ReviewStatus.Pending,
        },
      ],
    },
  ],
];

export const MOCK_PROGRESS: Progress = [
  {
    id: "1",
    title: "Approval",
    type: ProgressType.Review,
    status: ProgressStatus.Approved,
    isReportingLine: true,
    children: [
      {
        id: "jp",
        type: "user",
        assigneeName: "Jimmy Pitt",
        status: ReviewStatus.Approved,
        timestamp: "2025-10-23 09:41",
        comment: "Looks like no problem.",
      },
    ],
  },
  {
    id: "2",
    title: "Approvals",
    type: ProgressType.Review,
    status: ProgressStatus.Approved,
    isReportingLine: true,
    children: [
      {
        id: "pl",
        type: "user",
        assigneeName: "Phoebe Lin",
        status: ReviewStatus.Approved,
        timestamp: "2025-10-23 09:41",
        comment:
          "Your request has been approved because it meets all the required criteria.",
      },
      {
        id: "cc",
        type: "user",
        assigneeName: "Candace Cheng",
        status: ReviewStatus.Approved,
        timestamp: "2025-10-23 10:41",
      },
      {
        id: "kh",
        type: "user",
        assigneeName: "Kevin Huang",
        status: ReviewStatus.Approved,
        timestamp: "2025-10-23 11:41",
      },
    ],
  },
  {
    id: "3",
    title: "Approval branch",
    type: ProgressType.Condition,
    status: ProgressStatus.Pending,
    children: MOCK_CONDITION,
  },
  {
    id: "4",
    title: "CEO",
    type: ProgressType.Review,
    status: ProgressStatus.NotStarted,
    isReportingLine: true,

    children: [
      {
        id: "ceo",
        type: "department",
        assigneeName: "CEO",
        status: ReviewStatus.Pending,
      },
    ],
  },
  {
    id: "5",
    title: "Completed",
    type: ProgressType.End,
    status: ProgressStatus.NotStarted,
    children: null,
  },
];
const EXPENSE_CONDITION: Progress[] = [
  [
    {
      id: "condition-1",
      title: "To job grade 60",
      type: ProgressType.Review,
      status: ProgressStatus.Approved,
      isReportingLine: true,
      children: [
        {
          id: "pl",
          type: "user",
          assigneeName: "Phoebe Lin(skipped)",
          status: ReviewStatus.Approved,
          timestamp: "2025-10-23 09:41",
          comment:
            "Your request has been approved because it meets all the required criteria.",
        },
        {
          id: "cc",
          type: "user",
          assigneeName: "Candace Cheng(50)",
          status: ReviewStatus.Approved,
          timestamp: "2025-10-23 10:41",
        },
        {
          id: "kh",
          type: "user",
          assigneeName: "Kevin Huang(60)",
          status: ReviewStatus.Approved,
          timestamp: "2025-10-23 11:41",
        },
      ],
    },
    {
      id: "condition-2",
      title: "會簽",
      type: ProgressType.Group,
      status: ProgressStatus.Approved,
      method: "AND",
      children: [
        {
          isReportingLine: true,
          data: [
            {
              id: "rr1",
              type: "department",
              assigneeName: "Finance",
              status: ReviewStatus.Approved,
            },
            {
              id: "rr2",
              type: "department",
              assigneeName: "Marketing",
              status: ReviewStatus.Approved,
            },
          ],
        },
      ],
    },
    {
      id: "condition-3",
      title: "To jobgrade 80",
      type: ProgressType.Review,
      status: ProgressStatus.Pending,
      isReportingLine: true,
      children: [
        {
          id: "pl",
          type: "user",
          assigneeName: "Phoebe Li(skipped)",
          status: ReviewStatus.Approved,
          timestamp: "2025-10-23 09:41",
          comment:
            "Your request has been approved because it meets all the required criteria.",
        },
        {
          id: "cc",
          type: "user",
          assigneeName: "Candace Chen(skipped)",
          status: ReviewStatus.Approved,
          timestamp: "2025-10-23 10:41",
        },
        {
          id: "kh",
          type: "user",
          assigneeName: "Kevin Huang(skipped)",
          status: ReviewStatus.Approved,
          timestamp: "2025-10-23 11:41",
        },
        {
          id: "pl",
          type: "user",
          assigneeName: "Phoebe Lin(70)",
          status: ReviewStatus.Approved,
          timestamp: "2025-10-23 09:41",
          comment:
            "Your request has been approved because it meets all the required criteria.",
        },
        {
          id: "kh",
          type: "user",
          assigneeName: "Dylan Tsai(80)",
          status: ReviewStatus.Pending,
          timestamp: "2025-10-23 11:41",
        },
      ],
    },
  ],
];
const expenseApprovedCondition: Progress[] = [
  [
    {
      id: "condition-1",
      title: "To job grade 60",
      type: ProgressType.Review,
      status: ProgressStatus.Approved,
      isReportingLine: true,
      children: [
        {
          id: "pl",
          type: "user",
          assigneeName: "Phoebe Lin(skipped)",
          status: ReviewStatus.Approved,
          timestamp: "2025-10-23 09:41",
          comment:
            "Your request has been approved because it meets all the required criteria.",
        },
        {
          id: "cc",
          type: "user",
          assigneeName: "Candace Cheng(50)",
          status: ReviewStatus.Approved,
          timestamp: "2025-10-23 10:41",
        },
        {
          id: "kh",
          type: "user",
          assigneeName: "Kevin Huang(60)",
          status: ReviewStatus.Approved,
          timestamp: "2025-10-23 11:41",
        },
      ],
    },
    {
      id: "condition-2",
      title: "會簽",
      type: ProgressType.Group,
      status: ProgressStatus.Approved,
      method: "OR",
      children: [
        {
          isReportingLine: true,
          data: [
            {
              id: "rr1",
              type: "department",
              assigneeName: "Finance",
              status: ReviewStatus.Approved,
            },
            {
              id: "rr2",
              type: "department",
              assigneeName: "Marketing",
              status: ReviewStatus.Approved,
            },
          ],
        },
      ],
    },
    {
      id: "condition-3",
      title: "To jobgrade 80",
      type: ProgressType.Review,
      status: ProgressStatus.Approved,
      isReportingLine: true,
      children: [
        {
          id: "pl",
          type: "user",
          assigneeName: "Phoebe Li(skipped)",
          status: ReviewStatus.Approved,
          timestamp: "2025-10-23 09:41",
          comment:
            "Your request has been approved because it meets all the required criteria.",
        },
        {
          id: "cc",
          type: "user",
          assigneeName: "Candace Chen(skipped)",
          status: ReviewStatus.Approved,
          timestamp: "2025-10-23 10:41",
        },
        {
          id: "kh",
          type: "user",
          assigneeName: "Kevin Huang(skipped)",
          status: ReviewStatus.Approved,
          timestamp: "2025-10-23 11:41",
        },
        {
          id: "pl",
          type: "user",
          assigneeName: "Phoebe Lin(70)",
          status: ReviewStatus.Approved,
          timestamp: "2025-10-23 09:41",
          comment:
            "Your request has been approved because it meets all the required criteria.",
        },
        {
          id: "kh",
          type: "user",
          assigneeName: "Dylan Tsai(80)",
          status: ReviewStatus.Approved,
          timestamp: "2025-10-23 11:41",
        },
      ],
    },
  ],
];
const expenseRejectedCondition: Progress[] = [
  [
    {
      id: "condition-1",
      title: "To job grade 60",
      type: ProgressType.Review,
      status: ProgressStatus.Approved,
      isReportingLine: true,
      children: [
        {
          id: "pl",
          type: "user",
          assigneeName: "Phoebe Lin(skipped)",
          status: ReviewStatus.Approved,
          timestamp: "2025-10-23 09:41",
          comment:
            "Your request has been approved because it meets all the required criteria.",
        },
        {
          id: "cc",
          type: "user",
          assigneeName: "Candace Cheng(50)",
          status: ReviewStatus.Approved,
          timestamp: "2025-10-23 10:41",
        },
        {
          id: "kh",
          type: "user",
          assigneeName: "Kevin Huang(60)",
          status: ReviewStatus.Approved,
          timestamp: "2025-10-23 11:41",
        },
      ],
    },
    {
      id: "condition-2",
      title: "會簽",
      type: ProgressType.Group,
      status: ProgressStatus.Approved,
      method: "AND",
      children: [
        {
          isReportingLine: true,
          data: [
            {
              id: "rr1",
              type: "department",
              assigneeName: "Finance",
              status: ReviewStatus.Approved,
            },
            {
              id: "rr2",
              type: "department",
              assigneeName: "Marketing",
              status: ReviewStatus.Approved,
            },
          ],
        },
      ],
    },
    {
      id: "condition-3",
      title: "To jobgrade 80",
      type: ProgressType.Review,
      status: ProgressStatus.Rejected,
      isReportingLine: true,
      children: [
        {
          id: "pl",
          type: "user",
          assigneeName: "Phoebe Li(skipped)",
          status: ReviewStatus.Approved,
          timestamp: "2025-10-23 09:41",
          comment:
            "Your request has been approved because it meets all the required criteria.",
        },
        {
          id: "cc",
          type: "user",
          assigneeName: "Candace Chen(skipped)",
          status: ReviewStatus.Approved,
          timestamp: "2025-10-23 10:41",
        },
        {
          id: "kh",
          type: "user",
          assigneeName: "Kevin Huang(skipped)",
          status: ReviewStatus.Approved,
          timestamp: "2025-10-23 11:41",
        },
        {
          id: "pl",
          type: "user",
          assigneeName: "Phoebe Lin(70)",
          status: ReviewStatus.Approved,
          timestamp: "2025-10-23 09:41",
          comment:
            "Your request has been approved because it meets all the required criteria.",
        },
        {
          id: "kh",
          type: "user",
          assigneeName: "Dylan Tsai(80)",
          status: ReviewStatus.Rejected,
          // timestamp: "2025-10-23 11:41",
        },
      ],
    },
  ],
];
const expensePendingCondition: Progress[] = [
  [
    {
      id: "condition-1",
      title: "To job grade 60",
      type: ProgressType.Review,
      status: ProgressStatus.NotStarted,
      isReportingLine: true,
      children: [
        {
          id: "pl",
          type: "user",
          assigneeName: "Phoebe Lin(skipped)",
          status: null,
          timestamp: "2025-10-23 09:41",
          comment:
            "Your request has been approved because it meets all the required criteria.",
        },
        {
          id: "cc",
          type: "user",
          assigneeName: "Candace Cheng(50)",
          status: null,
          timestamp: "2025-10-23 10:41",
        },
        {
          id: "kh",
          type: "user",
          assigneeName: "Kevin Huang(60)",
          status: null,
          timestamp: "2025-10-23 11:41",
        },
      ],
    },
    {
      id: "condition-2",
      title: "會簽",
      type: ProgressType.Group,
      status: ProgressStatus.NotStarted,
      method: "OR",
      children: [
        {
          isReportingLine: true,
          data: [
            {
              id: "rr1",
              type: "department",
              assigneeName: "Finance",
              status: null,
            },
            {
              id: "rr2",
              type: "department",
              assigneeName: "Marketing",
              status: null,
            },
          ],
        },
      ],
    },
    {
      id: "condition-3",
      title: "To jobgrade 80",
      type: ProgressType.Review,
      status: ProgressStatus.NotStarted,
      isReportingLine: true,
      children: [
        {
          id: "pl",
          type: "user",
          assigneeName: "Phoebe Li(skipped)",
          status: null,
          timestamp: "2025-10-23 09:41",
          comment:
            "Your request has been approved because it meets all the required criteria.",
        },
        {
          id: "cc",
          type: "user",
          assigneeName: "Candace Chen(skipped)",
          status: null,
          timestamp: "2025-10-23 10:41",
        },
        {
          id: "kh",
          type: "user",
          assigneeName: "Kevin Huang(skipped)",
          status: null,
          timestamp: "2025-10-23 11:41",
        },
        {
          id: "pl",
          type: "user",
          assigneeName: "Phoebe Lin(70)",
          status: null,
          timestamp: "2025-10-23 09:41",
          comment:
            "Your request has been approved because it meets all the required criteria.",
        },
        {
          id: "kh",
          type: "user",
          assigneeName: "Dylan Tsai(80)",
          status: null,
          timestamp: "2025-10-23 11:41",
        },
      ],
    },
  ],
];
export const EXPENSE_PROGRESS: Progress = [
  {
    id: "1",
    title: "直屬主管審核",
    type: ProgressType.Review,
    status: ProgressStatus.Approved,
    isReportingLine: true,
    children: [
      {
        id: "pl",
        type: "user",
        assigneeName: "Phoebe Lin(40)",
        status: ReviewStatus.Approved,
        timestamp: "2025-10-23 09:41",
        comment:
          "Your request has been approved because it meets all the required criteria.",
      },
    ],
  },
  {
    id: "2",
    title: "採購審核",
    type: ProgressType.Condition,
    status: ProgressStatus.Pending,
    children: EXPENSE_CONDITION,
  },
  {
    id: "5",
    title: "Completed",
    type: ProgressType.End,
    status: ProgressStatus.NotStarted,
    children: null,
  },
] as const;

export const REJECTED_EXPENSE_PROGRESS: Progress = [
  {
    id: "1",
    title: "直屬主管審核",
    type: ProgressType.Review,
    status: ProgressStatus.Approved,
    isReportingLine: true,
    children: [
      {
        id: "pl",
        type: "user",
        assigneeName: "Phoebe Lin(40)",
        status: ReviewStatus.Approved,
        timestamp: "2025-10-23 09:41",
        comment:
          "Your request has been approved because it meets all the required criteria.",
      },
    ],
  },
  {
    id: "2",
    title: "採購審核",
    type: ProgressType.Condition,
    status: ProgressStatus.Rejected,
    children: expenseRejectedCondition,
  },
  {
    id: "5",
    title: "Completed",
    type: ProgressType.End,
    status: ProgressStatus.Rejected,
    children: null,
  },
];

export const APPROVED_EXPENSE_PROGRESS: Progress = [
  {
    id: "1",
    title: "直屬主管審核",
    type: ProgressType.Review,
    status: ProgressStatus.Approved,
    isReportingLine: true,
    children: [
      {
        id: "pl",
        type: "user",
        assigneeName: "Phoebe Lin(40)",
        status: ReviewStatus.Approved,
        timestamp: "2025-10-23 09:41",
        comment:
          "Your request has been approved because it meets all the required criteria.",
      },
    ],
  },
  {
    id: "2",
    title: "採購審核",
    type: ProgressType.Condition,
    status: ProgressStatus.Approved,
    children: expenseApprovedCondition,
  },
  {
    id: "5",
    title: "Completed",
    type: ProgressType.End,
    status: ProgressStatus.Approved,
    children: null,
  },
];

export const PENDING_EXPENSE_PROGRESS: Progress = [
  {
    id: "1",
    title: "直屬主管審核",
    type: ProgressType.Review,
    status: ProgressStatus.Pending,
    isReportingLine: true,
    children: [
      {
        id: "pl",
        type: "user",
        assigneeName: "Phoebe Lin(40)",
        status: ReviewStatus.Pending,
        timestamp: "2025-10-23 09:41",
        comment:
          "Your request has been approved because it meets all the required criteria.",
      },
    ],
  },
  {
    id: "2",
    title: "採購審核",
    type: ProgressType.Condition,
    status: ProgressStatus.NotStarted,
    children: expensePendingCondition,
  },
  {
    id: "5",
    title: "Completed",
    type: ProgressType.End,
    status: ProgressStatus.NotStarted,
    children: null,
  },
];
