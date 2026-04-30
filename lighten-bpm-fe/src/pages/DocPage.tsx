import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import buildInFunctions from "../../docs/expression/buildInFunctions.md?raw";
import conditionDoc from "../../docs/expression/condition.md?raw";
import formComponentsDoc from "../../docs/expression/formComponents.md?raw";
import referenceDoc from "../../docs/expression/reference.md?raw";
import validationDoc from "../../docs/expression/validation.md?raw";

const docs = [
  { id: "buildin", title: "Build-in Functions", content: buildInFunctions },
  { id: "reference", title: "Reference", content: referenceDoc },
  { id: "validation", title: "Validation", content: validationDoc },
  { id: "condition", title: "Condition", content: conditionDoc },
  { id: "form-components", title: "Form Components", content: formComponentsDoc },
];

export default function DocPage() {
  return (
    <div className="min-h-screen bg-gray-3">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-8 md:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="hidden md:block">
            <div className="sticky top-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-900">Docs</p>
              <nav className="mt-3 space-y-2">
                {docs.map((doc) => (
                  <a
                    key={doc.id}
                    href={`#${doc.id}`}
                    className="block text-sm text-gray-600 hover:text-gray-900"
                  >
                    {doc.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
          <div className="space-y-10">
            {docs.map((doc) => (
              <section
                key={doc.id}
                id={doc.id}
                className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4"
              >
                <h1 className="text-2xl font-semibold text-gray-900">
                  {doc.title}
                </h1>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  skipHtml
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-2xl font-semibold text-gray-900 mt-6 mb-3">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-lg font-semibold text-gray-900 mt-5 mb-2">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-gray-700 leading-7">{children}</p>
                    ),
                    a: ({ children, href }) => (
                      <a
                        href={href}
                        className="text-lighten-blue underline underline-offset-4"
                      >
                        {children}
                      </a>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc pl-6 text-gray-700 space-y-1">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal pl-6 text-gray-700 space-y-1">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => <li>{children}</li>,
                    code: ({ className, children }) => {
                      const match = /language-(\w+)/.exec(className ?? "");
                      const language = match?.[1];
                      if (language) {
                        return (
                          <SyntaxHighlighter
                            language={language}
                            style={oneLight}
                            customStyle={{
                              margin: 0,
                              background: "transparent",
                            }}
                            codeTagProps={{
                              style: {
                                background: "oklch(96.7% 0.003 264.542)",
                              },
                            }}
                          >
                            {String(children).replace(/\n$/, "")}
                          </SyntaxHighlighter>
                        );
                      }
                      return (
                        <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">
                          {children}
                        </code>
                      );
                    },
                    pre: ({ children }) => (
                      <pre className="bg-gray-100 rounded-md p-4 text-sm overflow-x-auto">
                        {children}
                      </pre>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-200 text-sm">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-gray-50">{children}</thead>
                    ),
                    th: ({ children }) => (
                      <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="border border-gray-200 px-3 py-2 text-gray-700">
                        {children}
                      </td>
                    ),
                  }}
                >
                  {doc.content}
                </ReactMarkdown>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
