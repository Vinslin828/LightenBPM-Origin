import { FormSchema } from "@/types/domain";

export const tempSchema = {
  root: [
    "afffb7c0-e431-49c3-89e0-582d768732dd",
    "f494a29f-9003-4b27-8d3e-3d1c0533dd9e",
    "3184513f-3858-48fe-85f9-2d780d9c9789",
    "1a816f72-c37a-4853-982c-2aa132a83942",
    "e18b73c5-386b-499f-b529-f194c5b74b6d",
    "d1fb3654-a037-4c7a-98b2-d2167649eccb",
    "2ccc71c0-d4c0-4ecb-8f4e-b776dc6317e2",
    "f67a28c2-a13c-42cb-a0b0-82aa37417243",
    "606bfdc1-7c00-4afd-ac31-b8798f2ee2bf",
  ],
  entities: {
    "afffb7c0-e431-49c3-89e0-582d768732dd": {
      type: "label",
      attributes: {
        name: "label_zx8sro",
        label: {
          value: "Label",
        },
        width: 12,
        richText: "<h2>Textarea</h2><p></p>",
      },
    },
    "4ebaff3b-3cc7-42bc-b1d7-8f706651e025": {
      type: "textarea",
      attributes: {
        name: "textarea_88lli0",
        label: {
          value: "Textarea_Config_1:show only",
          isReference: false,
        },
        width: 12,
        readonly: true,
        required: false,
        placeholder: "Type here...",
        defaultValue: {
          value: "Textarea component",
          isReference: false,
        },
      },
      parentId: "f494a29f-9003-4b27-8d3e-3d1c0533dd9e",
    },
    "5d8322a8-6af9-4708-bb74-496725a6544b": {
      type: "textarea",
      attributes: {
        name: "textarea_0dorng",
        label: {
          value: "Textarea_Config_2:Show+Required",
          isReference: false,
        },
        width: 12,
        readonly: true,
        required: true,
        placeholder: "Type here...",
        defaultValue: {
          reference: "getApplicantProfile().name",
          isReference: true,
        },
      },
      parentId: "f494a29f-9003-4b27-8d3e-3d1c0533dd9e",
    },
    "f494a29f-9003-4b27-8d3e-3d1c0533dd9e": {
      type: "container",
      attributes: {
        name: "container_udp2e5",
        label: {
          value: "Container",
        },
        width: 12,
        slotMapping: {
          "5d8322a8-6af9-4708-bb74-496725a6544b": 1,
          "4ebaff3b-3cc7-42bc-b1d7-8f706651e025": 0,
        },
        containerColumns: 2,
      },
      children: [
        "4ebaff3b-3cc7-42bc-b1d7-8f706651e025",
        "5d8322a8-6af9-4708-bb74-496725a6544b",
      ],
    },
    "955693fa-ae51-4c9e-9140-9dc759eb1b82": {
      type: "textarea",
      attributes: {
        name: "textarea_48fak2",
        label: {
          value: "Textarea_Config_3:Show+Required+Editable",
          isReference: false,
        },
        width: 12,
        required: true,
        placeholder: "Type here...",
        defaultValue: {
          isReference: false,
        },
      },
      parentId: "3184513f-3858-48fe-85f9-2d780d9c9789",
    },
    "ed3526ff-cb4c-46ac-95fd-e6f8356f2459": {
      type: "textarea",
      attributes: {
        hide: false,
        name: "textarea_5an0lg",
        label: {
          value: "Textarea_Config_4:Editable+Not required",
          isReference: false,
        },
        width: 12,
        required: false,
        placeholder: "Type here...",
        defaultValue: {
          isReference: false,
        },
      },
      parentId: "3184513f-3858-48fe-85f9-2d780d9c9789",
    },
    "3184513f-3858-48fe-85f9-2d780d9c9789": {
      type: "container",
      attributes: {
        name: "container_3wkodn",
        label: {
          value: "Container",
        },
        width: 12,
        slotMapping: {
          "955693fa-ae51-4c9e-9140-9dc759eb1b82": 0,
          "ed3526ff-cb4c-46ac-95fd-e6f8356f2459": 1,
        },
        containerColumns: 2,
      },
      children: [
        "955693fa-ae51-4c9e-9140-9dc759eb1b82",
        "ed3526ff-cb4c-46ac-95fd-e6f8356f2459",
      ],
    },
    "a6611a64-e301-436d-8b31-e20fb77ca70b": {
      type: "textarea",
      attributes: {
        hide: false,
        name: "textarea_incx5x",
        label: {
          value: "Textarea_Config_5:show+disabled",
          isReference: false,
        },
        width: 12,
        disabled: true,
        readonly: true,
        required: false,
        placeholder: "Type here...",
        defaultValue: {
          value: "Textarea component",
          isReference: false,
        },
      },
      parentId: "1a816f72-c37a-4853-982c-2aa132a83942",
    },
    "0ebca7fc-4950-402c-bc6c-3a540488b5e1": {
      type: "textarea",
      attributes: {
        hide: true,
        name: "textarea_fvi9w5",
        label: {
          value: "Textarea_Config_6:hide",
          isReference: false,
        },
        width: 12,
        disabled: false,
        readonly: true,
        required: false,
        placeholder: "Type here...",
        defaultValue: {
          value: "Hide Textarea",
          isReference: false,
        },
      },
      parentId: "1a816f72-c37a-4853-982c-2aa132a83942",
    },
    "1a816f72-c37a-4853-982c-2aa132a83942": {
      type: "container",
      attributes: {
        name: "container_7lgsm5",
        label: {
          value: "Container",
        },
        width: 12,
        slotMapping: {
          "a6611a64-e301-436d-8b31-e20fb77ca70b": 0,
        },
        containerColumns: 2,
      },
      children: [
        "a6611a64-e301-436d-8b31-e20fb77ca70b",
        "0ebca7fc-4950-402c-bc6c-3a540488b5e1",
      ],
    },
    "e18b73c5-386b-499f-b529-f194c5b74b6d": {
      type: "textarea",
      attributes: {
        name: "textarea_g7swas",
        label: {
          value: "Textarea_Config_7-Default",
          isReference: false,
        },
        width: 12,
        required: false,
        placeholder: "Type here...",
        defaultValue: {
          isReference: false,
        },
      },
    },
    "d1fb3654-a037-4c7a-98b2-d2167649eccb": {
      type: "label",
      attributes: {
        name: "label_6hao53",
        label: {
          value: "Label",
        },
        width: 12,
        richText:
          '<h3><span style="color: rgb(159, 189, 50);"><strong>Number</strong></span></h3><p></p>',
      },
    },
    "f76a8c45-00ef-4622-a058-858673793b39": {
      type: "number",
      attributes: {
        max: 100,
        min: 1,
        name: "number_y7mwj6",
        label: {
          value: "Number_Config_1:show only",
          isReference: false,
        },
        width: 12,
        readonly: true,
        required: false,
        defaultValue: {
          value: 100,
          reference: "",
          isReference: false,
        },
        decimalDigits: 0,
      },
      parentId: "2ccc71c0-d4c0-4ecb-8f4e-b776dc6317e2",
    },
    "80108394-b8a7-4991-a105-ff2f589ce25b": {
      type: "number",
      attributes: {
        name: "number_u3l54b",
        label: {
          value: "Number_Config_2:Show+Required",
          isReference: false,
        },
        width: 12,
        readonly: true,
        required: true,
        defaultValue: {
          value: 222.333,
          isReference: false,
        },
        decimalDigits: 3,
      },
      parentId: "2ccc71c0-d4c0-4ecb-8f4e-b776dc6317e2",
    },
    "2f336cf1-6c15-4f0c-9b15-914ecc46a4a2": {
      type: "number",
      attributes: {
        name: "number_yi3ez5",
        label: {
          value: "Number_Config_3:Show+Required+Editable",
          isReference: false,
        },
        width: 12,
        required: true,
        defaultValue: {
          isReference: false,
        },
        decimalDigits: 0,
      },
      parentId: "2ccc71c0-d4c0-4ecb-8f4e-b776dc6317e2",
    },
    "2ccc71c0-d4c0-4ecb-8f4e-b776dc6317e2": {
      type: "container",
      attributes: {
        name: "container_jr0o4t",
        label: {
          value: "Container",
        },
        width: 12,
        slotMapping: {
          "80108394-b8a7-4991-a105-ff2f589ce25b": 1,
          "f76a8c45-00ef-4622-a058-858673793b39": 0,
          "2f336cf1-6c15-4f0c-9b15-914ecc46a4a2": 2,
        },
        columnWidths: [0.711890243902439, 1.123475609756098, 1.164634146341463],
        containerColumns: 3,
      },
      children: [
        "f76a8c45-00ef-4622-a058-858673793b39",
        "80108394-b8a7-4991-a105-ff2f589ce25b",
        "2f336cf1-6c15-4f0c-9b15-914ecc46a4a2",
      ],
    },
    "68b615ac-1249-4efa-bd34-bd3dada35d6e": {
      type: "number",
      attributes: {
        hide: false,
        name: "number_de5oru",
        label: {
          value: "Number_Config_4:Editable+Not required",
          isReference: false,
        },
        width: 12,
        required: false,
        defaultValue: {
          isReference: false,
        },
        decimalDigits: 0,
      },
      parentId: "f67a28c2-a13c-42cb-a0b0-82aa37417243",
    },
    "e8dcf5bd-dca2-4b41-aebc-011dc945f42a": {
      type: "number",
      attributes: {
        name: "number_c8fr7r",
        label: {
          value: "Number_Config_5:show+disabled",
          isReference: false,
        },
        width: 12,
        disabled: true,
        readonly: true,
        required: false,
        defaultValue: {
          reference: 'getMasterData("mock_vendor")?.[0]?.credit_limit',
          isReference: true,
        },
        decimalDigits: 0,
      },
      parentId: "f67a28c2-a13c-42cb-a0b0-82aa37417243",
    },
    "a8002c24-3455-4d9b-a760-d8a3400334a6": {
      type: "number",
      attributes: {
        hide: true,
        name: "number_4zq1xi",
        label: {
          value: "Number_Config_6:hide",
          isReference: false,
        },
        width: 12,
        readonly: true,
        required: false,
        defaultValue: {
          value: 1223,
          isReference: false,
        },
        decimalDigits: 0,
      },
      parentId: "f67a28c2-a13c-42cb-a0b0-82aa37417243",
    },
    "f67a28c2-a13c-42cb-a0b0-82aa37417243": {
      type: "container",
      attributes: {
        name: "container_ka9a9l",
        label: {
          value: "Container",
        },
        width: 12,
        slotMapping: {
          "e8dcf5bd-dca2-4b41-aebc-011dc945f42a": 1,
        },
        columnWidths: [1, 0.7759146341463414, 1.224085365853659],
        containerColumns: 3,
      },
      children: [
        "68b615ac-1249-4efa-bd34-bd3dada35d6e",
        "e8dcf5bd-dca2-4b41-aebc-011dc945f42a",
        "a8002c24-3455-4d9b-a760-d8a3400334a6",
      ],
    },
    "606bfdc1-7c00-4afd-ac31-b8798f2ee2bf": {
      type: "number",
      attributes: {
        name: "number_h6v3e2",
        label: {
          value: "Number_Config_7-Default",
          isReference: false,
        },
        width: 12,
        required: false,
        defaultValue: {
          isReference: false,
        },
        decimalDigits: 0,
      },
    },
  },
};
