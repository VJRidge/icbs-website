import ResourcePageShell, { ResourceBookCta, ResourceFooterMeta } from './ResourcePageShell'

const PDF = '/downloads/resources/Builder_Quick_Reference.pdf'

export default function BuilderQuickReferencePage() {
  return (
    <ResourcePageShell title="Builder Quick Reference">
      <nav aria-label="Breadcrumb" className="k o">
        <a href="/resources">Resources</a> / Builder Quick Reference
      </nav>
      <p className="k o" style={{ marginTop: '1rem' }}>
        Free resource
      </p>
      <h1>Builder Quick Reference</h1>
      <p className="resource-lede">
        A practical check before the next prompt, the next fix, and the next “done.” Building with AI means making
        decisions, checking the work, and protecting what already works. Keep this reference nearby.
      </p>
      <div className="resource-actions">
        <a className="btn" href={PDF} download>
          Download the printable reference
        </a>
        <a className="btn line" href="/resources/templates">
          Get the editable templates
        </a>
      </div>

      <h2>Before you start</h2>
      <p>
        Name one outcome. “Make the site better” leaves too much room for invention. “Add a download button below the
        introduction and keep the existing text unchanged” gives the work a boundary.
      </p>
      <p>
        Identify what must keep working. List the nearby pages and any important flows the change could affect. Treat
        sign-in, payments, email, and private data with particular care.
      </p>
      <p>
        Save a known-good baseline. Review what is already changed, save appropriate tracked work in a commit, and use a
        branch for the next change. A branch does not back up uncommitted work or isolate a shared database.
      </p>
      <p>
        <strong>Try this instruction:</strong> “Read the relevant project files and rules. Explain the smallest change
        needed for [outcome], the files involved, and how we will check it. Do not edit yet.”
      </p>

      <h2>The working loop</h2>
      <p className="resource-loop">Specify → Branch → Small change → Test → Commit → Next</p>
      <p>
        Specify what should happen and what should stay the same. Work from a recorded baseline. Make one manageable
        change. Inspect the diff, run relevant checks, and try the behavior yourself. Commit the verified change with a
        useful message, then move on. Small changes are easier to inspect and easier to recover from. They still need
        testing.
      </p>

      <h2>Before you accept done</h2>
      <ul className="resource-check">
        <li>The app starts and the relevant page loads without new errors.</li>
        <li>The requested behavior works through the real user path.</li>
        <li>Saved data survives a refresh or return visit, where persistence is expected.</li>
        <li>One relevant edge case or failure path has been checked.</li>
        <li>Nearby behavior still works.</li>
        <li>Sign-in and sign-out still work if the change touches access or session state.</li>
        <li>The diff matches the intended scope and contains no real secrets.</li>
        <li>Relevant automated checks have run; any failures are explained.</li>
        <li>Evidence and unresolved issues are recorded before committing.</li>
      </ul>
      <p>
        <strong>Try this instruction:</strong> “Review the change against the original request. List what was tested,
        what was not tested, and any remaining issues. Do not call it complete based only on a successful build.”
      </p>

      <h2>When something breaks</h2>
      <p>
        Record what you expected and what happened. Capture the error, the steps that reproduce it, and a screenshot if
        the screen helps explain the problem.
      </p>
      <p>
        Check the layer before rewriting. Is the development server running? Is there a browser error? Is the request
        failing? Is access denied? These are questions to investigate, not answers to assume.
      </p>
      <p>
        Ask for a diagnosis before another broad fix. Compare against the last working state and keep unrelated changes
        out of the investigation.
      </p>
      <p>
        <strong>Try this instruction:</strong> “Expected: [result]. Actual: [result]. Steps: [steps]. Evidence: [error
        or screenshot]. Investigate the likely cause and explain the smallest fix. Do not rewrite unrelated files.”
      </p>

      <h2>Keep the receipt</h2>
      <p>
        Write down the change, the checks, the result, and the next step. Be specific: “Saved a test record, refreshed,
        and confirmed it remained” is more useful than “seems fine.”
      </p>

      <h2>Choose your next resource</h2>
      <p>
        Use the ROADMAP starter to keep track of done, next, and blocked. Use the Project Rules starter to make your
        boundaries explicit. Use Before You Accept Done to record your checks.
      </p>

      <div className="resource-related">
        <p className="k o">Related</p>
        <p>
          <a href="/resources/templates">Templates</a>
          {' · '}
          <a href="/resources/tools-and-updates">Tools &amp; Updates</a>
          {' · '}
          <a href="/resources">All resources</a>
        </p>
        <p>
          <em>I Call BS</em> expands this process through practical workflows, build experiences, prompts, and checks
          for the work between a promising screen and a working product.
        </p>
        <ResourceBookCta />
      </div>
      <ResourceFooterMeta />
    </ResourcePageShell>
  )
}
