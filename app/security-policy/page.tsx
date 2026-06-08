import { Navbar } from "../components/Navbar";

export const metadata = {
  title: "Security Policy · PromptingHub",
  description: "How to responsibly report a security vulnerability in PromptingHub.",
};

export default function SecurityPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Security Policy</h1>
        <div className="prose dark:prose-invert text-gray-700 dark:text-gray-300 space-y-4">
          <p>
            We take the security of PromptingHub seriously. If you believe you have found a security
            vulnerability, please report it responsibly so we can address it before it is disclosed publicly.
          </p>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Reporting</h2>
          <p>
            Email <a href="mailto:security@promptinghub.app" className="text-blue-600 dark:text-blue-400 hover:underline">security@promptinghub.app</a> with
            a description of the issue, steps to reproduce, and any relevant logs or screenshots. Please give us a
            reasonable window to investigate and fix before public disclosure.
          </p>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Scope</h2>
          <p>
            Anything affecting the confidentiality, integrity, or availability of user data is in scope. Please avoid
            automated scanning that degrades service, and never access or modify data that is not yours.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Machine-readable contact details are published at <code>/.well-known/security.txt</code>.
          </p>
        </div>
      </main>
    </div>
  );
}
