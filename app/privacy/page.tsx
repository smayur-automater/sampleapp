'use client'
import React from 'react'
import Shell from '@/components/Shell'

export default function PrivacyPolicy() {
  return (
    <Shell>
    <div style={{ background:'#fff', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif', color:'#111827' }}>
      

      <div style={{ maxWidth:760, margin:'0 auto', padding:'48px 24px 80px' }}>
        <h1 style={{ fontSize:32, fontWeight:800, color:'#111827', marginBottom:6 }}>Privacy Policy</h1>
        <p style={{ fontSize:14, color:'#6b7280', marginBottom:48 }}>Effective date: 18 May 2026 &nbsp;·&nbsp; Last updated: 18 May 2026</p>

        <S title="1. About This Policy">
          <P>This Privacy Policy describes how <strong>Xfiniti Technology Pty Ltd</strong>, trading as <strong>KidExpense</strong> (&ldquo;we&rdquo;, "us", "our"), collects, uses, stores, and discloses personal information when you use the KidExpense mobile and web application (the "App"). By creating an account or using the App, you acknowledge that you have read and agree to this policy.</P>
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
          <P>For users in the European Economic Area or United Kingdom, we process personal data under the following legal bases:</P>
          <UL items={[
            'Contract performance (Art. 6(1)(b) GDPR) — processing necessary to deliver the App services you have agreed to',
            'Legitimate interests (Art. 6(1)(f) GDPR) — improving the App, preventing fraud, ensuring security, where not overridden by your rights',
            'Consent (Art. 6(1)(a) GDPR) — where you have provided explicit consent (for example, optional communications)',
            'Legal obligation (Art. 6(1)(c) GDPR) — where required by applicable law',
          ]}/>
          <P>The transfer of your personal data from the EEA or United Kingdom to Australia is made under Standard Contractual Clauses (SCCs) as described in Section 8.3 of this policy.</P>
        </S>

        <S title="5. Data Sharing and Disclosure">
          <H3>5.1 Household Members</H3>
          <P>Expense data, settlement records, and profile names are visible to all members of your shared household. You control who is invited.</P>
          <H3>5.2 Service Providers</H3>
          <P>We share data with the following third-party processors under strict data processing agreements:</P>
          <UL items={[
            'Supabase Inc. — database, authentication, and file storage. Primary region: Sydney, Australia. Data Processing Agreement and SCCs executed.',
            'Vercel Inc. — application hosting and content delivery. Primary region: Sydney, Australia. Data Processing Agreement and SCCs executed.',
            'Resend Inc. — transactional email delivery. Data Processing Agreement and SCCs executed.',
          ]}/>
          <P>All providers are contractually required to process data only as instructed and to maintain appropriate security measures.</P>
          <H3>5.3 Legal Requirements</H3>
          <P>We may disclose information if required by law, court order, or government authority, or to protect the rights, property, or safety of KidExpense, our users, or the public.</P>
          <H3>5.4 Business Transfer</H3>
          <P>If KidExpense is acquired or undergoes a change of ownership, your information may transfer as part of that transaction. You will be notified by email or in-app notice.</P>
          <H3>5.5 No Sale of Data</H3>
          <P>We do not sell, rent, or trade your personal information to any third party for their marketing purposes.</P>
        </S>

        <S title="6. Data Retention">
          <UL items={['Account data is retained until you delete your account','Expense, settlement, and financial records are retained for a minimum of 7 years from creation date, in compliance with Australian financial record-keeping obligations under the Corporations Act 2001 (Cth) and taxation law','Receipt images are deleted within 30 days of account deletion','Audit logs are retained for 12 months','Anonymised aggregate statistics may be retained indefinitely']}/>
        </S>

        <S title="7. Data Security">
          <UL items={['All data in transit is encrypted using TLS 1.2 or higher','All data at rest is encrypted using AES-256','Passwords are hashed using bcrypt','Row-Level Security (RLS) ensures users can only access data within their own household','Access to production systems is restricted to authorised personnel','Regular security reviews and dependency updates are performed']}/>
          <P>While we implement strong security measures, no electronic system is 100% secure. We cannot guarantee absolute security.</P>
        </S>

        <S title="8. International Data Transfers and Data Residency">

          <H3>8.1 Primary storage location</H3>
          <P>All personal data collected through KidExpense is <strong>stored and processed in Australia</strong> (Sydney region). We have chosen Australian infrastructure as our primary data store to comply with the Australian Privacy Act 1988 (Cth) and to serve our primary user base.</P>

          <H3>8.2 Third-party processors and cross-border transfers</H3>
          <P>We use the following third-party processors. Where data passes through infrastructure outside Australia, we have executed appropriate legal safeguards:</P>
          <UL items={[
            'Supabase Inc. — database, authentication, and file storage. Configured to the Asia-Pacific (Sydney, ap-southeast-2) region. Processing agreement and Standard Contractual Clauses (SCCs) in place.',
            'Vercel Inc. — application hosting. Primary deployment in the Sydney edge region. Some edge cache nodes may operate globally for performance. Data Processing Agreement and SCCs in place.',
            'Resend Inc. — transactional email delivery (account verification, settlement notifications). Email may be routed through international infrastructure. Data Processing Agreement and SCCs in place.',
          ]}/>
          <P>Each of these providers is contractually required to process personal data only as instructed by us, implement appropriate technical and organisational security measures, and comply with applicable data protection law.</P>

          <H3>8.3 European Economic Area (EEA) and United Kingdom — GDPR</H3>
          <P>Australia is not on the European Commission&apos;s list of countries with an adequacy decision for the purposes of the EU General Data Protection Regulation (GDPR) or UK GDPR. For users located in the EEA or United Kingdom, the transfer of personal data to Australia is lawfully made under <strong>Standard Contractual Clauses (SCCs)</strong> approved by the European Commission (Commission Decision 2021/914 of 4 June 2021), incorporated into our agreements with all processors.</P>
          <P>By using KidExpense from the EEA or United Kingdom, you acknowledge that your personal data will be transferred to and processed in Australia under these safeguards. You have the right to obtain a copy of the SCCs applicable to your data by contacting <strong>info@xfiniti.com.au</strong>.</P>

          <H3>8.4 United States — CCPA (California)</H3>
          <P>The California Consumer Privacy Act (CCPA) does not impose data residency requirements. There is no legal requirement to store California residents&apos; data within the United States. Our Sydney infrastructure is fully compliant with CCPA obligations. We do not sell personal information. California residents may exercise their rights under Section 9.7 of this policy.</P>

          <H3>8.5 Canada — PIPEDA</H3>
          <P>Canada&apos;s Personal Information Protection and Electronic Documents Act (PIPEDA) permits cross-border data transfers provided the receiving organisation applies comparable protection. By using KidExpense, Canadian residents are informed that their data is stored in Australia and processed under the safeguards described in this policy. You may withdraw consent at any time, subject to legal and contractual restrictions.</P>

          <H3>8.6 Other international users</H3>
          <P>If you are located in a jurisdiction with specific data residency laws not addressed above, please contact us at <strong>info@xfiniti.com.au</strong> before using the Service. We will advise whether the Service can be made available to you in a compliant manner.</P>

          <H3>8.7 Future multi-region infrastructure</H3>
          <P>As our user base grows, we may introduce regional data storage options (for example, EU or US regions) to better serve users in those jurisdictions. We will update this policy and notify existing users if we change the location where their data is stored.</P>

        </S>

        <S title="9. Your Rights and Choices">
          <H3>9.1 Access and Portability</H3>
          <P>You may request a copy of all personal data we hold about you by contacting <strong>info@xfiniti.com.au</strong>. Premium users may export expense data as CSV directly from the App.</P>
          <H3>9.2 Correction</H3>
          <P>You may update your profile (name, phone) within the App at any time.</P>
          <H3>9.3 Deletion</H3>
          <P>You may request deletion of your account and personal data. Expense records shared within a household may be retained in anonymised form or as required by law. To request deletion, email <strong>info@xfiniti.com.au</strong> with subject &ldquo;Account Deletion Request&rdquo;. We will action your request within 30 days.</P>
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
          <P>KidExpense is designed for use by adults (18 years and older) to manage shared expenses for their dependent children. <strong>The App is not directed at children and is not intended to be used by individuals under 18.</strong></P>
          <P>While users enter their children&apos;s names and optional dates of birth to categorise expenses, this data is entered exclusively by the adult account holders and is accessible only within that household. We do not use this data for any purpose other than displaying it to the household members.</P>
          <P>We do not knowingly collect personal information directly from children under 13. If you believe a child has submitted information to us directly, please contact <strong>info@xfiniti.com.au</strong> and we will promptly delete it.</P>
          <P><strong>Apple App Store rating:</strong> This App is rated 4+ (suitable for all ages) and contains no objectionable content. It is a financial management tool for adults.</P>
        </S>

        <S title="11. Subscription and Trial">
          <P>KidExpense offers a <strong>30-day free trial</strong> for new accounts, during which all features are available at no charge. After the trial period, a <strong>Premium subscription at AUD $7.00 per month</strong> is required to continue using the App.</P>
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
            <p style={{ margin:'0 0 4px', fontWeight:700, fontSize:14 }}>Xfiniti Technology Pty Ltd (trading as KidExpense)</p>
            <p style={{ margin:'0 0 4px', fontSize:14, color:'#374151' }}>Australia</p>
            <p style={{ margin:'0 0 0', fontSize:14, color:'#374151' }}>Email: <a href="mailto:info@xfiniti.com.au" style={{ color:'#1d4ed8' }}>info@xfiniti.com.au</a> — we respond within 30 days</p>
          </div>

        </S>

        <div style={{ marginTop:48, paddingTop:24, borderTop:'1px solid #e5e7eb', fontSize:12, color:'#9ca3af' }}>
          <p style={{ margin:0 }}>KidExpense Privacy Policy · Xfiniti Technology Pty Ltd · Effective 18 May 2026</p>
          <p style={{ margin:'4px 0 0' }}>This policy satisfies the requirements of the Australian Privacy Act 1988, GDPR, CCPA, Apple App Store Review Guidelines 5.1, and Google Play Developer Policy.</p>
        </div>
      </div>
    </div>
    </Shell>
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
