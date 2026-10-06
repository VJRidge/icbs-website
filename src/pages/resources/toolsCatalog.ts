/** Neutral tool reference entries. Documentation reviewed dates are editorial, not visit dates. */

export type ToolEntry = {
  category: string
  name: string
  job: string
  does: string
  watch: string
  firstTask: string
  docsUrl: string
  docsLabel?: string
  extraUrl?: string
  extraLabel?: string
  reviewed: string
}

export const TOOL_SECTIONS: { heading: string; tools: ToolEntry[] }[] = [
  {
    heading: 'Edit and inspect a project',
    tools: [
      {
        category: 'Code editor',
        name: 'Cursor',
        job: 'Work on code with an AI coding agent and inspect changes in the development environment.',
        does: 'Its agent can search project files, edit code, and run terminal commands.',
        watch:
          'A confident response does not prove the change stayed within scope or works. Inspect the diff and check the real behavior.',
        firstTask: 'Ask it to explain a small existing component without changing anything.',
        docsUrl: 'https://cursor.com/docs/agent/overview',
        reviewed: 'October 5, 2026',
      },
    ],
  },
  {
    heading: 'Work through a coding task with an agent',
    tools: [
      {
        category: 'Coding assistant',
        name: 'Claude Code',
        job: 'Investigate and implement coding tasks with access to project files and development tools.',
        does: 'Reads code, edits files, and runs commands across its supported working environments.',
        watch:
          'Review the intended scope and permissions. When switching between tools on one project, use a clear handoff and avoid unsynchronized edits to the same files.',
        firstTask: 'Ask it to read the project instructions and propose a small implementation plan before editing.',
        docsUrl: 'https://code.claude.com/docs/en/overview',
        reviewed: 'October 5, 2026',
      },
    ],
  },
  {
    heading: 'Save data and manage access',
    tools: [
      {
        category: 'Backend',
        name: 'Supabase',
        job: 'Provide a backend when your product needs a database, authentication, or file storage.',
        does: 'Provides Postgres and services including Auth and Storage.',
        watch:
          'Having authentication does not automatically establish correct access to private records. Configure and test permissions. Keep privileged server-side keys out of the browser.',
        firstTask: 'Map who should read and change each type of data before creating tables.',
        docsUrl: 'https://supabase.com/docs',
        extraUrl: 'https://supabase.com/docs/guides/database/postgres/row-level-security',
        extraLabel: 'Access reference',
        reviewed: 'October 5, 2026',
      },
    ],
  },
  {
    heading: 'Record and inspect changes',
    tools: [
      {
        category: 'Version control',
        name: 'Git',
        job: 'Track changes to project files and preserve recorded versions.',
        does: 'Commits record staged changes; branches organize separate lines of development.',
        watch:
          'Uncommitted work is not saved just because a branch exists. A code commit does not back up your hosted database or uploaded media.',
        firstTask: 'Inspect status and diff, then save an appropriate known-good commit before a risky change.',
        docsUrl: 'https://git-scm.com/book/en/v2/Git-Basics-Recording-Changes-to-the-Repository',
        reviewed: 'October 5, 2026',
      },
    ],
  },
]
