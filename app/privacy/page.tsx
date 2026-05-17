import React from 'react'

export const metadata = {
  title: 'Privacy Policy — CoParent Pay',
  description: 'Privacy Policy for CoParent Pay by Xfiniti Technology Pty Ltd',
}

export default function PrivacyPolicy() {
  return (
    <div style={{ minHeight:'100vh', background:'#fff', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif', color:'#111827' }}>
      <div style={{ borderBottom:'1px solid #e5e7eb', padding:'16px 24px', display:'flex', alignItems:'center', gap:12 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="CoParent Pay" style={{ width:32, height:32, objectFit:'contain' }} />
        <span style={{ fontWeight:700, fontSize:16, color:'#111827' }}>CoParent Pay</span>
      </div>

      <div style={{ maxWidth:760, margin:'0 auto', padding:'48px 24px 80px' }}>
        <h1 style={{ fontSize:32, fontWeight:800, color:'#111827', marginBottom:6 }}>Privacy Policy</h1>
        <p style={{ fontSize:14, color:'#6b7280', marginBottom:48 }}>Effective date: 18 May 2026 &nbsp;·&nbsp; Last updated: 18 May 2026</p>

        <S title="1. About This Policy">
          <P>This Privacy Policy describes how <strong>Xfiniti Technology Pty Ltd</strong>, trading as <strong>CoParent Pay</strong> ("we", "us", "our"), collects, uses, stores, and discloses personal information when you use the CoParent Pay mobile and web application (the "App"). By creating an account or using the App, you acknowledge that you have read and agree to this policy.</P>
          <P>We comply with the <strong>Australian Privacy Act 1988 (Cth)</strong> and the Australian Privacy Principles (APPs). Where applicable, we also comply with the <strong>EU General Data Protection Regulation (GDPR)</strong> and the <strong>California Consumer Privacy Act (CCPA)</strong>.</P>
        </S>

        <S title="2. Information We Collect">
          <H3>2.1 Information You Provide</H3>
          <UL items={['Full name and display name','Email address','Phone number (optional)','Password (stored as a one-way hash — we never store plaintext passwords)','Expense details: descriptions, amounts, dates, categories','Receipt images you upload','Settlement notes and co-parent correspondence within the App']}/>
          <H3>2.2 Automatically Collected Information</H3>
          <UL items={['Device type, operating system, and browser version','IP address and approximate location (country/city level only)','App usage patterns and session duration','Error logs and crash diagnostics','Authentication tokens and session identifiers']}/>
          <H3>2.3 Information About Children</H3>
          <P>To categorise shared expenses, users enter their children&apos;s names and optional dates of birth. This data is entered by and visible only to the adults in the household. The App is not directed at children and we do not knowingly collect personal data directly from individuals under 13. See Section 10 for full details.</P>
        </S>

        <S title="3. How We Use Your Information">
          <UL items={['Create and manage your account','Provide expense tracking and settlement features','Send transactional emails (account verification, password reset, settlement notifications, co-parent invitations)','Display shared expense data to your authorised household members only','Calculate financial balances and generate settlement summaries','Generate monthly statements (Premium subscribers)','Improve the App through aggregated, anonymised analytics','Respond to support requests','Enforce our Terms of Service and prevent fraud','Comply with legal and regulatory obligations']}/>
          <P><strong>We do not use your financial data for advertising, sell it to third parties, or use it to train AI or machine learning models.</strong></P>
        </S>

        <S title="4. Legal Basis for Processing (GDPR)">
          <P>For users in the European Economic Area, we process personal data under the following legal bases:</P>
          <UL items={['Contract performance — processing necessary to deliver the App services you have agreed to','Legitimate interests — improving the App, preventing fraud, ensuring security (where not overridden by your rights)','Consent — where you have provided explicit consent','Legal obligation — where required by applicable law']}/>
        </S>

        <S title="5. Data Sharing and Disclosure">
          <H3>5.1 Household Members</H3>
          <P>Expense data, settlement records, and profile names are visible to all members of your shared household. You control who is invited.</P>
          <H3>5.2 Service Providers</H3>
          <P>We share data with the following third-party processors under strict data processing agreements:</P>
          <UL items={['Supabase Inc. — database, authentication, and file storage (United States)','Vercel Inc. — application hosting and content delivery (United States)','Resend Inc. — transactional email delivery (United States)']}/>
          <P>All providers are contractually required to process data only as instructed and to maintain appropriate security measures.</P>
          <H3>5.3 Legal Requirements</H3>
          <P>We may disclose information if required by law, court order, or government authority, or to protect the rights, property, or safety of CoParent Pay, our users, or the public.</P>
          <H3>5.4 Business Transfer</H3>
          <P>If CoParent Pay is acquired or undergoes a change of ownership, your information may transfer as part of that transaction. You will be notified by email or in-app notice.</P>
          <H3>5.5 No Sale of Data</H3>
          <P>We do not sell, rent, or trade your personal information to any third party for their marketing purposes.</P>
        </S>

        <S title="6. Data Retention">
          <UL items={['Account data is retained until you delete your account','Expense and settlement records are retained for 7 years from creation to satisfy financial record-keeping obligations','Receipt images are deleted within 30 days of account deletion','Audit logs are retained for 12 months','Anonymised aggregate statistics may be retained indefinitely']}/>
        </S>

        <S title="7. Data Security">
          <UL items={['All data in transit is encrypted using TLS 1.2 or higher','All data at rest is encrypted using AES-256','Passwords are hashed using bcrypt','Row-Level Security (RLS) ensures users can only access data within their own household','Access to production systems is restricted to authorised personnel','Regular security reviews and dependency updates are performed']}/>
          <P>While we implement strong security measures, no electronic system is 100% secure. We cannot guarantee absolute security.</P>
        </S>

        <S title="8. International Data Transfers">
          <P>Your data is stored and processed in data centres operated by our service providers, primarily in the United States. When transferring data outside Australia or the EEA, we ensure appropriate safeguards including Standard Contractual Clauses approved by the European Commission and adherence to recognised data transfer frameworks.</P>
        </S>

        <S title="9. Your Rights and Choices">
          <H3>9.1 Access and Portability</H3>
          <P>You may request a copy of all personal data we hold about you by contacting <strong>info@xfiniti.com.au</strong>. Premium users may export expense data as CSV directly from the App.</P>
          <H3>9.2 Correction</H3>
          <P>You may update your profile (name, phone) within the App at any time.</P>
          <H3>9.3 Deletion</H3>
          <P>You may request deletion of your account and personal data. Expense records shared within a household may be retained in anonymised form or as required by law. To request deletion, email <strong>info@xfiniti.com.au</strong> with subject "Account Deletion Request". We will action your request within 30 days.</P>
          <H3>9.4 Restriction and Objection (GDPR)</H3>
          <P>You have the right to restrict processing of your data or object to processing based on legitimate interests. Contact us to exercise these rights.</P>
          <H3>9.5 Withdraw Consent</H3>
          <P>Where processing is based on consent, you may withdraw it at any time without affecting the lawfulness of prior processing.</P>
          <H3>9.6 Communications</H3>
          <P>Transactional emails (account verification, settlement notifications) are essential to the service. You may unsubscribe from any optional marketing communications at any time.</P>
          <H3>9.7 California Residents (CCPA)</H3>
          <P>California residents have the right to know what personal information is collected, to request deletion, and to opt out of the sale of personal information. We do not sell personal information. Contact <strong>info@xfiniti.com.au</strong> to exercise your rights.</P>
        </S>

        <S title="10. Children's Privacy">
          <P>CoParent Pay is designed for use by adults (18 years and older) to manage shared expenses for their dependent children. <strong>The App is not directed at children and is not intended to be used by individuals under 18.</strong></P>
          <P>While users enter their children&apos;s names and optional dates of birth to categorise expenses, this data is entered exclusively by the adult account holders and is accessible only within that household. We do not use this data for any purpose other than displaying it to the household members.</P>
          <P>We do not knowingly collect personal information directly from children under 13. If you believe a child has submitted information to us directly, please contact <strong>info@xfiniti.com.au</strong> and we will promptly delete it.</P>
          <P><strong>Apple App Store rating:</strong> This App is rated 4+ (suitable for all ages) and contains no objectionable content. It is a financial management tool for adults.</P>
        </S>

        <S title="11. Subscription and Trial">
          <P>CoParent Pay offers a <strong>7-day free trial</strong> for new accounts, during which all features are available at no charge. After the trial period, a <strong>Premium subscription at AUD $7.00 per month</strong> is required to continue using the App.</P>
          <P>Subscriptions are managed through the Apple App Store or Google Play Store and are subject to those platforms&apos; subscription and refund policies. We do not store payment card details. Subscription pricing may change with 30 days&apos; notice to existing subscribers.</P>
          <P>You may cancel your subscription at any time through your App Store account settings. Cancellation takes effect at the end of the current billing period.</P>
        </S>

        <S title="12. Cookies and Analytics">
          <P>The App uses minimal session storage to maintain your authentication state. We do not use third-party advertising cookies or cross-site tracking. Any analytics tools we use collect anonymised, aggregated data only and cannot be used to identify individual users.</P>
        </S>

        <S title="13. Third-Party Services">
          <P>The App may link to third-party websites or services. This Privacy Policy does not apply to those third parties. We encourage you to review their privacy policies before providing any personal information.</P>
        </S>

        <S title="14. Changes to This Policy">
          <P>We may update this Privacy Policy from time to time. Material changes will be communicated by a prominent in-app notice, an email to your registered address, and an update to the effective date above. Continued use of the App after changes take effect constitutes acceptance of the updated policy.</P>
        </S>

        <S title="15. Contact and Complaints">
          <P>For questions, concerns, or data requests, contact our Privacy Officer:</P>
          <div style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:6, padding:'20px 24px', marginTop:12, marginBottom:16 }}>
            <p style={{ margin:'0 0 4px', fontWeight:700, fontSize:14 }}>Xfiniti Technology Pty Ltd (trading as CoParent Pay)</p>
            <p style={{ margin:'0 0 4px', fontSize:14, color:'#374151' }}>Australia</p>
            <p style={{ margin:'0 0 0', fontSize:14, color:'#374151' }}>Email: <a href="mailto:info@xfiniti.com.au" style={{ color:'#1d4ed8' }}>info@xfiniti.com.au</a> — we respond within 30 days</p>
          </div>
          <P>If you believe we have not handled your personal information appropriately, you may lodge a complaint with the <strong>Office of the Australian Information Commissioner (OAIC)</strong> at <a href="https://www.oaic.gov.au" style={{ color:'#1d4ed8' }}>oaic.gov.au</a>, or your local data protection authority (EEA residents), or the California Attorney General (California residents).</P>
        </S>

        <div style={{ marginTop:48, paddingTop:24, borderTop:'1px solid #e5e7eb', fontSize:12, color:'#9ca3af' }}>
          <p style={{ margin:0 }}>CoParent Pay Privacy Policy · Xfiniti Technology Pty Ltd · Effective 18 May 2026</p>
          <p style={{ margin:'4px 0 0' }}>This policy satisfies the requirements of the Australian Privacy Act 1988, GDPR, CCPA, Apple App Store Review Guidelines 5.1, and Google Play Developer Policy.</p>
        </div>
      </div>
    </div>
  )
}

function S({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:40 }}>
      <h2 style={{ fontSize:19, fontWeight:700, color:'#111827', marginBottom:14, paddingBottom:8, borderBottom:'1px solid #f3f4f6' }}>{title}</h2>
      {children}
    </div>
  )
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize:14, fontWeight:700, color:'#374151', marginBottom:8, marginTop:18 }}>{children}</h3>
}
function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize:14, color:'#4b5563', lineHeight:1.8, marginBottom:12 }}>{children}</p>
}
function UL({ items }: { items: string[] }) {
  return (
    <ul style={{ paddingLeft:20, margin:'0 0 14px' }}>
      {items.map((item, i) => (
        <li key={i} style={{ fontSize:14, color:'#4b5563', lineHeight:1.8, marginBottom:3 }}>{item}</li>
      ))}
    </ul>
  )
}
