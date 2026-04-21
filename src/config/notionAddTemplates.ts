export const notionAddTemplatesConfig = {
  defaultTemplate: "basic",
  templates: [
    {
      key: "basic",
      label: "Basic Wiki Page",
      description: "Title, optional opening paragraph, and tags.",
    },
    {
      key: "feature",
      label: "Feature Spec",
      description: "Adds quick prompts for owner and acceptance criteria.",
      fields: [
        {
          id: "owner",
          label: "Feature owner",
          placeholder: "@name or team name",
          required: false,
          property: "Owner",
          type: "rich_text",
        },
        {
          id: "acceptance",
          label: "Acceptance criteria",
          placeholder: "What does done look like?",
          required: false,
          property: "Acceptance Criteria",
          type: "rich_text",
        },
      ],
    },
  ],
} as const;
