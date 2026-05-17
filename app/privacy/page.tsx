'use client'
import Link from 'next/link'

const LAST_UPDATED = 'May 2026'
const CONTACT_EMAIL = 'info@xfiniti.com.au'
const APP_NAME = 'CoParent Pay'
const COMPANY = 'Xfiniti Technology Pty Ltd'
const COMPANY_ABN = '' // fill in if available

const S: Record<string, React.CSSProperties> = {
  page:    { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#fff', color: '#1a1a1a', lineHeight: 1.7 },
  wrap:    { maxWidth: 760, margin: '0 auto', padding: '40px 24px 80px' },
  header:  { borderBottom: '1px solid #e5e7eb', paddingBottom: 24, marginBottom: 32 },
  logo:    { fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 6 },
  meta:    { fontSize: 13, color: '#6b7280' },
  h2:      { fontSize: 18, fontWeight: 700, color: '#111827', marginTop: 36, marginBottom: 10 },
  h3:      { fontSize: 15, fontWeight: 600, color: '#374151', marginTop: 20, marginBottom: 8 },
  p:       { fontSize: 14, color: '#374151', marginBottom: 12 },
  li:      { fontSize: 14, color: '#374151', marginBottom: 6, paddingLeft: 8 },
  table:   { width: '100%', borderCollapse: 'collapse' as const, marginBottom: 16, fontSize: 13 },
  th:      { textAlign: 'left' as const, padding: '8px 12px', background: '#f9fafb', border: '1px solid #e5e7eb', fontWeight: 600, color: '#374151' },
  td:      { padding: '8px 12px', border: '1px solid #e5e7eb', color: '#374151', verticalAlign: 'top' as const },
  callout: { background: '#f0fdf4', border: '1px solid #d1fae5', borderRadius: 6, padding: '14px 16px', marginBottom: 16, fontSize: 14, color: '#065f46' },
  warn:    { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '14px 16px', marginBottom: 16, fontSize: 14, color: '#374151' },
  back:    { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151', textDecoration: 'none', marginBottom: 24, border: '1px solid #e5e7eb', padding: '6px 12px', borderRadius: 4 },
}

export default function PrivacyPage() {
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <Link href="/dashboard" style={S.back}>← Back to app</Link>

        <div style={S.header}>
          <div style={S.logo}>{APP_NAME}</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '8px 0 8px' }}>
            Privacy Policy
          </h1>
          <p style={{ ...S.meta, margin: 0 }}>
            Last updated: {LAST_UPDATED} · {COMPANY}
            {COMPANY_ABN && ` · ABN ${COMPANY_ABN}`}
          </p>
        </div>

        <div style={S.callout}>
          <strong>Summary:</strong> CoParent Pay collects only the information needed to run your shared expense account. We do not sell your data, share it with advertisers, or use it for any purpose other than providing and improving this service.
        </div>

        {/* 1 */}
        <h2 style={S.h2}>1. About This Policy</h2>
        <p style={S.p}>
          This Privacy Policy explains how {COMPANY} ("<strong>we</strong>", "<strong>us</strong>", "<strong>our</strong>") collects, uses, stores, and protects personal information when you use {APP_NAME} (the "<strong>Service</strong>"), available as a mobile application and web application.
        </p>
        <p style={S.p}>
          By creating an account or using the Service, you agree to the collection and use of information described in this policy. If you do not agree, please do not use the Service.
        </p>
        <p style={S.p}>
          This policy complies with the <em>Privacy Act 1988</em> (Cth) and the Australian Privacy Principles (APPs), as well as applicable data protection laws in other jurisdictions including the GDPR (where applicable).
        </p>

        {/* 2 */}
        <h2 style={S.h2}>2. Information We Collect</h2>

        <h3 style={S.h3}>2.1 Information You Provide Directly</h3>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Category</th>
              <th style={S.th}>Examples</th>
              <th style={S.th}>Purpose</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Account information', 'First name, last name, email address, password (hashed)', 'Create and authenticate your account'],
              ['Contact information', 'Phone number', 'Account security and notifications'],
              ['Expense data', 'Expense descriptions, amounts, dates, categories, split percentages', 'Core service functionality'],
              ['Child information', 'Children\'s first names, date of birth (optional), gender (optional)', 'Linking expenses to specific children'],
              ['Payment records', 'Settlement amounts, settlement notes, dates', 'Settlement tracking between co-parents'],
              ['Receipt images', 'Photos or PDFs uploaded as receipts', 'Document storage for expense records'],
              ['Support communications', 'Messages sent to our support team', 'Resolving issues and improving the service'],
            ].map(([cat, ex, pur]) => (
              <tr key={cat as string}>
                <td style={{ ...S.td, fontWeight: 600 }}>{cat}</td>
                <td style={S.td}>{ex}</td>
                <td style={S.td}>{pur}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 style={S.h3}>2.2 Information Collected Automatically</h3>
        <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
          {[
            'Device type, operating system, and version',
            'App version',
            'General usage data (screens visited, features used) — used only in aggregate',
            'Crash reports and error logs',
            'IP address (used for security, not stored long-term)',
          ].map(item => <li key={item} style={S.li}>{item}</li>)}
        </ul>

        <h3 style={S.h3}>2.3 Information We Do NOT Collect</h3>
        <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
          {[
            'Bank account details or payment card numbers',
            'Government-issued identification documents',
            'Precise real-time location',
            'Contacts or address book data',
            'Microphone, camera, or other sensor data (except when you explicitly upload a receipt)',
            'Data from third-party accounts or social media',
          ].map(item => <li key={item} style={S.li}>{item}</li>)}
        </ul>

        {/* 3 */}
        <h2 style={S.h2}>3. How We Use Your Information</h2>
        <p style={S.p}>We use your information for the following purposes:</p>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Purpose</th>
              <th style={S.th}>Legal Basis (GDPR)</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Providing and operating the Service (account creation, expense tracking, settlement workflow)', 'Performance of contract'],
              ['Authenticating your identity and maintaining account security', 'Performance of contract / Legitimate interests'],
              ['Sending transactional notifications (invitation emails, settlement approvals)', 'Performance of contract'],
              ['Responding to support requests', 'Legitimate interests'],
              ['Improving and debugging the Service', 'Legitimate interests'],
              ['Complying with legal obligations', 'Legal obligation'],
              ['Detecting and preventing fraud or abuse', 'Legitimate interests'],
            ].map(([purpose, basis]) => (
              <tr key={purpose as string}>
                <td style={S.td}>{purpose}</td>
                <td style={{ ...S.td, whiteSpace: 'nowrap' as const }}>{basis}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={S.p}>
          <strong>We do not use your data for advertising, profiling, or sale to third parties.</strong>
        </p>

        {/* 4 */}
        <h2 style={S.h2}>4. Information Sharing and Disclosure</h2>

        <h3 style={S.h3}>4.1 Sharing with Your Co-Parent</h3>
        <p style={S.p}>
          The core purpose of {APP_NAME} is shared expense management. When you join a shared household with another person, the following information is visible to them:
        </p>
        <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
          {[
            'Your display name',
            'Expenses you record (description, amount, date, category, child)',
            'Settlement requests you submit or approve',
            'Activity log entries related to shared expenses',
          ].map(item => <li key={item} style={S.li}>{item}</li>)}
        </ul>
        <p style={S.p}>Your email address, phone number, and password are never shared with other users.</p>

        <h3 style={S.h3}>4.2 Service Providers</h3>
        <p style={S.p}>We share data with the following trusted service providers, solely to operate the Service:</p>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Provider</th>
              <th style={S.th}>Purpose</th>
              <th style={S.th}>Data Shared</th>
              <th style={S.th}>Location</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Supabase', 'Database, authentication, file storage', 'All user and expense data', 'USA (AWS)'],
              ['Vercel', 'Application hosting', 'Anonymised request logs', 'USA / Global CDN'],
              ['Resend', 'Transactional email delivery', 'Email address, name, invitation/notification content', 'USA'],
            ].map(([provider, purpose, data, location]) => (
              <tr key={provider as string}>
                <td style={{ ...S.td, fontWeight: 600 }}>{provider}</td>
                <td style={S.td}>{purpose}</td>
                <td style={S.td}>{data}</td>
                <td style={S.td}>{location}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={S.p}>All service providers are contractually bound to protect your data and may not use it for their own purposes.</p>

        <h3 style={S.h3}>4.3 Legal Requirements</h3>
        <p style={S.p}>
          We may disclose your information if required by law, court order, or government authority, or where we believe disclosure is necessary to protect the rights, property, or safety of {COMPANY}, our users, or the public.
        </p>

        <h3 style={S.h3}>4.4 Business Transfers</h3>
        <p style={S.p}>
          In the event of a merger, acquisition, or sale of all or part of our business, user data may be transferred to the acquiring entity. We will notify affected users by email and provide an opportunity to delete their account before the transfer takes effect.
        </p>

        {/* 5 */}
        <h2 style={S.h2}>5. Data Storage and Security</h2>
        <p style={S.p}>
          Your data is stored on Supabase infrastructure hosted on Amazon Web Services (AWS). The following security measures are in place:
        </p>
        <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
          {[
            'All data is encrypted in transit using TLS 1.2 or higher',
            'Data at rest is encrypted using AES-256',
            'Passwords are hashed using bcrypt and never stored in plaintext',
            'Row-Level Security (RLS) policies ensure each user can only access their own household data',
            'Authentication tokens expire and are rotated automatically',
            'Access to production infrastructure is restricted to authorised personnel only',
          ].map(item => <li key={item} style={S.li}>{item}</li>)}
        </ul>
        <p style={S.p}>
          No system is completely secure. While we implement industry-standard protections, we cannot guarantee absolute security. In the event of a data breach that is likely to result in serious harm, we will notify affected users and relevant authorities within 72 hours of becoming aware of the breach.
        </p>

        {/* 6 */}
        <h2 style={S.h2}>6. Data Retention</h2>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Data Type</th>
              <th style={S.th}>Retention Period</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Account data (name, email)', 'Until account deletion, plus 30 days backup retention'],
              ['Expense and settlement records', 'Until account deletion or household deletion, plus 30 days backup retention'],
              ['Receipt images', 'Until manually deleted by user or account deletion'],
              ['Activity logs', 'Up to 12 months'],
              ['Support communications', 'Up to 2 years'],
              ['Anonymised analytics', 'Up to 3 years'],
              ['Backup copies', 'Up to 30 days after deletion request'],
            ].map(([type, retention]) => (
              <tr key={type as string}>
                <td style={{ ...S.td, fontWeight: 500 }}>{type}</td>
                <td style={S.td}>{retention}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 7 */}
        <h2 style={S.h2}>7. Your Rights and Choices</h2>
        <p style={S.p}>Depending on your location, you have the following rights regarding your personal information:</p>
        <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
          {[
            { right: 'Access', desc: 'Request a copy of all personal data we hold about you.' },
            { right: 'Correction', desc: 'Update or correct inaccurate information through your profile settings or by contacting us.' },
            { right: 'Deletion', desc: 'Request deletion of your account and all associated data. See Section 8.' },
            { right: 'Data portability', desc: 'Export your expense data in CSV format (Premium feature) or request a full data export by contacting us.' },
            { right: 'Objection', desc: 'Object to processing of your data for legitimate interests purposes.' },
            { right: 'Restriction', desc: 'Request that we restrict processing of your data in certain circumstances.' },
            { right: 'Withdraw consent', desc: 'Where processing is based on consent, withdraw it at any time.' },
          ].map(({ right, desc }) => (
            <li key={right} style={S.li}><strong>{right}:</strong> {desc}</li>
          ))}
        </ul>
        <p style={S.p}>
          To exercise any of these rights, contact us at <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#374151', fontWeight: 600 }}>{CONTACT_EMAIL}</a>. We will respond within 30 days.
        </p>

        {/* 8 */}
        <h2 style={S.h2}>8. Account Deletion</h2>
        <p style={S.p}>You can delete your account at any time. To do so:</p>
        <ol style={{ paddingLeft: 24, marginBottom: 16 }}>
          {[
            `Open ${APP_NAME} and go to Settings`,
            'Tap "Delete account" and confirm',
            'Alternatively, email us at ' + CONTACT_EMAIL + ' with subject "Account Deletion Request"',
          ].map((step, i) => <li key={i} style={S.li}>{step}</li>)}
        </ol>
        <p style={S.p}>
          When you delete your account: your profile is immediately deactivated; all personal data is deleted within 30 days; anonymised expense data (no names or email) may be retained for fraud detection and aggregate analytics; data shared with a co-parent in an active household will be retained for that household until the co-parent also deletes their account.
        </p>

        {/* 9 */}
        <h2 style={S.h2}>9. Children's Privacy</h2>
        <p style={S.p}>
          {APP_NAME} is intended for use by adults (18 years and older). We do not knowingly collect personal information from children under the age of 13. The "child" information stored in the app (e.g., a child's name and date of birth) is entered by adult account holders for the purpose of tracking child-related expenses — we do not create accounts for or directly interact with minors.
        </p>
        <p style={S.p}>
          If you believe we have inadvertently collected personal information from a child under 13, please contact us immediately at <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#374151', fontWeight: 600 }}>{CONTACT_EMAIL}</a> and we will delete it promptly.
        </p>

        {/* 10 */}
        <h2 style={S.h2}>10. Cookies and Tracking</h2>
        <p style={S.p}>
          The web version of {APP_NAME} uses the following:
        </p>
        <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
          {[
            { name: 'Session cookies', purpose: 'Required for authentication and keeping you logged in. These expire when you close your browser or after your session timeout.' },
            { name: 'Local storage', purpose: 'Stores your session token locally so you remain logged in across browser restarts.' },
          ].map(({ name, purpose }) => (
            <li key={name} style={S.li}><strong>{name}:</strong> {purpose}</li>
          ))}
        </ul>
        <p style={S.p}>
          We do not use advertising cookies, third-party tracking cookies, or any analytics cookies that track you across other websites.
        </p>

        {/* 11 */}
        <h2 style={S.h2}>11. International Data Transfers</h2>
        <p style={S.p}>
          Your data is stored in the United States on AWS infrastructure operated by Supabase. By using the Service, you consent to the transfer of your data outside Australia. Where required, we rely on appropriate safeguards (such as Standard Contractual Clauses) to ensure your data receives adequate protection.
        </p>

        {/* 12 */}
        <h2 style={S.h2}>12. Third-Party Links</h2>
        <p style={S.p}>
          The Service may contain links to third-party websites (e.g., payment instructions, resources). This Privacy Policy does not apply to those sites. We encourage you to read the privacy policies of any third-party sites you visit.
        </p>

        {/* 13 */}
        <h2 style={S.h2}>13. Changes to This Policy</h2>
        <p style={S.p}>
          We may update this Privacy Policy from time to time. When we make material changes, we will:
        </p>
        <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
          {[
            'Update the "Last updated" date at the top of this policy',
            'Display a notice within the app',
            'Send an email notification for significant changes',
          ].map(item => <li key={item} style={S.li}>{item}</li>)}
        </ul>
        <p style={S.p}>
          Continued use of the Service after changes take effect constitutes acceptance of the revised policy.
        </p>

        {/* 14 */}
        <h2 style={S.h2}>14. Contact and Complaints</h2>
        <p style={S.p}>
          If you have questions about this Privacy Policy or wish to make a privacy-related request or complaint, contact us:
        </p>
        <div style={S.warn}>
          <strong>{COMPANY}</strong><br/>
          Privacy enquiries: <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#374151' }}>{CONTACT_EMAIL}</a><br/>
          Website: xfiniti.com.au
        </div>
        <p style={S.p}>
          If you are not satisfied with our response, you may lodge a complaint with the Office of the Australian Information Commissioner (OAIC) at <a href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer" style={{ color: '#374151' }}>oaic.gov.au</a>.
        </p>
        <p style={S.p}>
          For EU/UK residents: you may also contact your local data protection authority.
        </p>

        <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 40, paddingTop: 20 }}>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
            {APP_NAME} Privacy Policy · {LAST_UPDATED} · {COMPANY}
            {COMPANY_ABN && ` · ABN ${COMPANY_ABN}`}
          </p>
        </div>
      </div>
    </div>
  )
}
