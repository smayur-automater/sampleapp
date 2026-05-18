'use client'
import React from 'react'
import Shell from '@/components/Shell'

function S({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #f3f4f6' }}>{title}</h2>
      {children}
    </div>
  )
}
function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.85, marginBottom: 12 }}>{children}</p>
}
function UL({ items }: { items: string[] }) {
  return (
    <ul style={{ paddingLeft: 20, margin: '0 0 14px' }}>
      {items.map((item, i) => <li key={i} style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.85, marginBottom: 5 }}>{item}</li>)}
    </ul>
  )
}
function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderLeft: '3px solid #d97706', borderRadius: 4, padding: '12px 16px', marginBottom: 14 }}>
      <p style={{ fontSize: 13, color: '#92400e', lineHeight: 1.7, margin: 0 }}>{children}</p>
    </div>
  )
}

export default function TermsPage() {
  return (
    <Shell>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 80px', fontFamily: 'system-ui,-apple-system,sans-serif' }}>

        {/* Header */}
        <div style={{ marginBottom: 44, paddingBottom: 28, borderBottom: '1px solid #e5e7eb' }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: '#111827', marginBottom: 6 }}>Terms of Service &amp; Legal Disclaimer</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Effective date: 18 May 2026 &nbsp;·&nbsp; Last updated: 18 May 2026</p>
          <Warn>
            <strong>Important:</strong> By creating an account or using CoParent Pay, you agree to these Terms in full. If you do not agree, you must not use the application. These Terms contain important limitations on liability, disclaimers of warranties, and an indemnification obligation. Please read carefully.
          </Warn>
        </div>

        <S title="1. About these Terms">
          <P>These Terms of Service ("Terms") constitute a legally binding agreement between you ("User", "you", "your") and <strong>Xfiniti Technology Pty Ltd</strong> (ABN pending), trading as <strong>CoParent Pay</strong> ("we", "us", "our", "Company"), governing your access to and use of the CoParent Pay mobile application and web platform (the "Service").</P>
          <P>These Terms are governed by the laws of the State of New South Wales, Australia, and the Commonwealth of Australia. Any dispute arising from these Terms will be subject to the exclusive jurisdiction of the courts of New South Wales, Australia.</P>
        </S>

        <S title="2. Nature of the Service">
          <P>CoParent Pay is a <strong>financial expense tracking and record-keeping tool</strong>. It enables users to log, categorise, and share records of child-related expenses between co-parents or within a household unit.</P>
          <Warn>
            CoParent Pay is NOT a legal service, family law service, mediation service, counselling service, financial advice service, or court-authorised record system. Nothing in this Service constitutes legal, financial, therapeutic, or professional advice of any kind.
          </Warn>
          <P>The Service is intended solely to assist users in organising their own expense records. The Company makes no representation that records created within the Service are accurate, complete, admissible in legal proceedings, or compliant with any court order or parenting agreement.</P>
        </S>

        <S title="3. No Responsibility for Parental Disputes">
          <P>CoParent Pay is a neutral tool. The Company is not a party to any parenting arrangement, separation agreement, divorce proceeding, family court matter, parenting plan, or dispute between users.</P>
          <UL items={[
            'The Company takes no responsibility for any conflict, dispute, disagreement, or legal proceeding arising between co-parents or household members who use the Service.',
            'The Company does not mediate, adjudicate, or intervene in any dispute between users.',
            'Expense records, settlement records, and other data entered into the Service reflect information entered solely by users. The Company does not verify, validate, or certify the accuracy of any user-entered data.',
            'No employee, contractor, or representative of the Company may be compelled to give evidence or provide expert opinion in any family law or civil proceeding on behalf of any user, except as required by law.',
            'The Company is not responsible for how data from the Service is used, interpreted, or presented by either party in any legal, mediation, or negotiation context.',
          ]}/>
        </S>

        <S title="4. Court Subpoenas and Legal Requests">
          <P>The Company will comply with valid court orders, subpoenas, and lawful requests from Australian government authorities to produce data. In such circumstances:</P>
          <UL items={[
            'We will endeavour to notify the affected user before complying, unless prohibited by law or court order from doing so.',
            'We cannot guarantee the completeness, accuracy, or format of data produced in response to a legal request — data is provided as stored, without modification.',
            'Users must not rely solely on CoParent Pay as their only record for legal proceedings. Users are responsible for maintaining their own independent records and seeking independent legal advice.',
            'The Company accepts no liability for any legal outcome, adverse judgment, or consequence arising from data produced in response to a legal request.',
            'Response to legal requests from authorities outside Australia will be assessed on a case-by-case basis in accordance with Australian law and our Privacy Policy.',
          ]}/>
        </S>

        <S title="5. Personal Information and PII">
          <P>CoParent Pay collects only the personal information that users voluntarily provide as necessary to operate the Service. The Company does not independently collect, verify, or process sensitive personal information beyond what is described in our Privacy Policy.</P>
          <UL items={[
            'Users are solely responsible for the accuracy, completeness, and lawfulness of personal information they enter into the Service, including information about third parties such as children and co-parents.',
            'By entering personal information about another person (including a child or co-parent), you represent that you have the legal right to do so and, where required, have obtained any necessary consent.',
            'The Company does not collect government-issued identification numbers, tax file numbers, financial account numbers, credit card details, or sensitive health information as part of the core Service.',
            'Expense descriptions, amounts, and categories are user-generated content. The Company does not classify this information as sensitive PII and processes it solely to provide the Service.',
          ]}/>
          <P>In the event of a data breach, the Company will comply with obligations under the Australian Privacy Act 1988 (Cth) Notifiable Data Breaches scheme and take all reasonable steps to contain and remediate the breach. However, the Company is not liable for indirect, consequential, or economic loss arising from a data breach where the Company has taken reasonable security measures as described in the Privacy Policy.</P>
        </S>

        <S title="6. Disclaimer of Warranties">
          <Warn>
            The Service is provided "AS IS" and "AS AVAILABLE" without warranty of any kind, express or implied. To the fullest extent permitted by applicable law, the Company expressly disclaims all warranties including but not limited to: merchantability, fitness for a particular purpose, accuracy, reliability, availability, uninterrupted access, and non-infringement.
          </Warn>
          <P>The Company does not warrant that:</P>
          <UL items={[
            'The Service will be available at all times or free from errors, bugs, or interruptions',
            'Data entered into the Service will be preserved indefinitely or recovered after a technical failure',
            'The Service is suitable for use as evidence in any court, tribunal, or legal proceeding',
            'Settlement records or expense records generated by the Service are legally binding on any party',
            'The Service will meet the specific requirements of any court order, parenting plan, or family law obligation',
          ]}/>
        </S>

        <S title="7. Limitation of Liability">
          <P>To the fullest extent permitted by law, the Company, its directors, employees, contractors, and agents shall not be liable to you or any third party for:</P>
          <UL items={[
            'Any indirect, incidental, special, consequential, punitive, or exemplary damages',
            'Loss of data, loss of revenue, loss of profits, or loss of goodwill',
            'Damage arising from reliance on records or data produced by the Service in any legal proceeding',
            'Any outcome in family court, civil court, or mediation proceedings, regardless of whether Service data was used',
            'Any dispute, conflict, or breakdown in the co-parenting relationship between users',
            'Unauthorised access to user data by third parties where the Company has taken reasonable security measures',
            'Service outages, data loss, or degraded performance beyond the Company\'s reasonable control',
          ]}/>
          <P>Where liability cannot be excluded under Australian Consumer Law or other applicable legislation, the Company\'s total aggregate liability to you for all claims arising out of or in connection with the Service shall not exceed the total amount paid by you to the Company in the 12-month period immediately preceding the event giving rise to the claim, or AUD $100.00, whichever is greater.</P>
        </S>

        <S title="8. Indemnification">
          <P>You agree to indemnify, defend, and hold harmless the Company, its officers, directors, employees, contractors, and agents from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable legal fees) arising out of or in connection with:</P>
          <UL items={[
            'Your use of the Service',
            'Any data, content, or information you enter into the Service',
            'Your breach of these Terms',
            'Your violation of any applicable law or regulation',
            'Any claim by a third party (including a co-parent, child, or family member) arising from data you entered about them',
            'Any reliance placed by you or a third party on records generated by the Service in legal proceedings',
          ]}/>
        </S>

        <S title="9. User Responsibilities">
          <P>By using CoParent Pay, you agree that:</P>
          <UL items={[
            'You are at least 18 years of age',
            'All information you enter is accurate to the best of your knowledge',
            'You will not use the Service to harass, intimidate, or coerce another user',
            'You will not enter false, misleading, or fabricated expense records',
            'You will not attempt to access another user\'s account without authorisation',
            'You will not use the Service for any unlawful purpose',
            'You are responsible for maintaining the security of your login credentials',
            'You will promptly notify us of any unauthorised access to your account at info@xfiniti.com.au',
          ]}/>
        </S>

        <S title="10. Children's Data">
          <P>CoParent Pay is designed for use by adults to manage expenses for their dependent children. Users may enter their children's names and dates of birth to categorise expenses. By doing so:</P>
          <UL items={[
            'You confirm you are the parent or legal guardian of the child whose information you enter',
            'You accept full responsibility for the accuracy of information entered about your child',
            'You acknowledge the Company does not independently verify parental or guardian status',
            'You agree that children\'s data entered into the Service will be processed as described in the Privacy Policy',
          ]}/>
          <P>The Company does not knowingly collect personal information directly from children under 18. The Service is not directed at children.</P>
        </S>

        <S title="11. Intellectual Property">
          <P>All software, design, branding, trademarks, and content comprising the CoParent Pay Service are the exclusive property of Xfiniti Technology Pty Ltd. You are granted a limited, non-exclusive, non-transferable licence to use the Service for your personal, non-commercial purposes only.</P>
          <P>You may not copy, reproduce, distribute, reverse-engineer, modify, or create derivative works from any part of the Service without prior written consent from the Company.</P>
        </S>

        <S title="12. Termination">
          <P>The Company reserves the right to suspend or terminate your account at any time, with or without notice, if you breach these Terms or if we reasonably believe your use of the Service poses a risk to other users or the integrity of the platform.</P>
          <P>Upon termination, your right to access the Service ceases immediately. Data retention following termination is governed by the Privacy Policy. Sections 3, 4, 5, 6, 7, 8, and 13 of these Terms survive termination.</P>
        </S>

        <S title="13. Governing Law and Dispute Resolution">
          <P>These Terms are governed by the laws of New South Wales, Australia and the Commonwealth of Australia. You irrevocably submit to the exclusive jurisdiction of the courts of New South Wales for the resolution of any dispute arising from these Terms or the Service.</P>
          <P>Before commencing legal proceedings, both parties agree to attempt to resolve any dispute through good-faith negotiation for a period of not less than 30 days. Contact us at <a href="mailto:info@xfiniti.com.au" style={{ color: '#2563eb' }}>info@xfiniti.com.au</a> to initiate this process.</P>
          <P>Nothing in this clause prevents either party from seeking urgent injunctive relief from a court of competent jurisdiction.</P>
        </S>

        <S title="14. Australian Consumer Law">
          <P>Nothing in these Terms excludes, restricts, or modifies any right or remedy, or any guarantee, warranty, or other term or condition, implied or imposed by the Australian Consumer Law that cannot lawfully be excluded or limited. Where the Australian Consumer Law applies and we are permitted to limit our liability, our liability is limited to re-supplying the Service or paying the cost of having the Service re-supplied.</P>
        </S>

        <S title="15. Changes to These Terms">
          <P>We may update these Terms from time to time. Material changes will be communicated by in-app notice and email to your registered address, with at least 14 days notice before taking effect. Continued use of the Service after the effective date of updated Terms constitutes acceptance.</P>
        </S>

        <S title="16. Severability">
          <P>If any provision of these Terms is found to be invalid, illegal, or unenforceable by a court of competent jurisdiction, that provision shall be modified to the minimum extent necessary to make it enforceable, or severed if modification is not possible. The remaining provisions shall continue in full force and effect.</P>
        </S>

        <S title="17. Entire Agreement">
          <P>These Terms, together with the Privacy Policy, Refund Policy, and any other policies referenced herein, constitute the entire agreement between you and the Company regarding your use of the Service and supersede all prior agreements, representations, and understandings.</P>
        </S>

        {/* Contact box */}
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '20px 24px', marginTop: 8 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Xfiniti Technology Pty Ltd (trading as CoParent Pay)</p>
          <p style={{ fontSize: 14, color: '#374151', margin: '0 0 4px' }}>Australia</p>
          <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>Legal enquiries: <a href="mailto:info@xfiniti.com.au" style={{ color: '#2563eb' }}>info@xfiniti.com.au</a></p>
        </div>

        <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid #e5e7eb', fontSize: 12, color: '#9ca3af' }}>
          <p style={{ margin: 0 }}>CoParent Pay Terms of Service &amp; Legal Disclaimer · Xfiniti Technology Pty Ltd · Effective 18 May 2026</p>
          <p style={{ margin: '4px 0 0' }}>This document has been prepared to provide legal protection for the Company and should be reviewed by a qualified Australian solicitor before App Store and Google Play submission.</p>
        </div>

      </div>
    </Shell>
  )
}
