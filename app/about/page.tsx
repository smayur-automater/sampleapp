'use client'
import React from 'react'
import Shell from '@/components/Shell'
import {
  CpuChipIcon,
  DevicePhoneMobileIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'

const PILLARS = [
  {
    icon: CpuChipIcon,
    title: 'AI agents & automation',
    desc: 'We design and deploy autonomous AI agents and multi-step workflows that handle complex logic end-to-end — reducing manual overhead and accelerating decisions.',
  },
  {
    icon: DevicePhoneMobileIcon,
    title: 'Consumer applications',
    desc: 'From family finance tools to lifestyle apps, we build products with real users in mind — clean interfaces, reliable data, and AI intelligence layered underneath.',
  },
  {
    icon: ChartBarIcon,
    title: 'Dashboards & analytics',
    desc: 'We turn raw data into actionable insight through purpose-built dashboards, reporting pipelines, and visualisation tools tailored to each organisation\'s needs.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Cybersecurity',
    desc: 'Our security practice provides threat assessment, secure architecture review, and ongoing monitoring — helping businesses stay resilient against an evolving threat landscape.',
  },
]

const VALUES = [
  'Intelligence that is explainable and trustworthy',
  'Security embedded from day one, not bolted on',
  'Products built for real people, not just personas',
  'Australian-made, globally deployable',
  'Honest, outcome-focused partnerships',
  'Privacy and data ethics at the core',
]

const T: React.CSSProperties = { fontFamily: 'system-ui, -apple-system, sans-serif' }
const LBL: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px', display: 'block' }
const DIVIDER: React.CSSProperties = { border: 'none', borderTop: '1px solid #e5e7eb', margin: '32px 0' }

export default function AboutPage() {
  return (
    <Shell>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px 64px', ...T }}>

        {/* Hero */}
        <div style={{ paddingBottom: 32, borderBottom: '1px solid #e5e7eb', marginBottom: 32 }}>
          <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: '#eff6ff', color: '#2563eb', letterSpacing: '0.05em', marginBottom: 16 }}>
            About us
          </span>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', lineHeight: 1.3, margin: '0 0 14px', letterSpacing: '-0.4px' }}>
            We build intelligent software<br />for a more connected world
          </h1>
          <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.8, margin: 0, maxWidth: 560 }}>
            Xfiniti Technologies is an Australian technology company specialising in AI-powered consumer applications and enterprise cybersecurity — turning complex problems into software that simply works.
          </p>
        </div>

        {/* Who we are */}
        <div style={{ marginBottom: 32 }}>
          <span style={LBL}>Who we are</span>
          <p style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.8, margin: 0 }}>
            Founded in Australia, Xfiniti Technologies Pty Ltd sits at the intersection of two fast-moving disciplines: artificial intelligence and cybersecurity. We are a team of engineers, product designers, and security specialists united by a belief that great software should be both powerful and approachable. Our work spans consumer-facing applications used by everyday people, and robust security frameworks protecting the organisations behind them.
          </p>
        </div>

        <hr style={DIVIDER} />

        {/* What we do */}
        <div style={{ marginBottom: 32 }}>
          <span style={LBL}>What we do</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {PILLARS.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '16px 18px' }}>
                <Icon style={{ width: 20, height: 20, color: '#2563eb', marginBottom: 10 }} />
                <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>{title}</p>
                <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.65, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <hr style={DIVIDER} />

        {/* Our approach */}
        <div style={{ marginBottom: 32 }}>
          <span style={LBL}>Our approach</span>
          <p style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.8, margin: 0 }}>
            We treat every engagement as a long-term partnership. That means shipping products that are secure by design, built on proven engineering foundations, and ready to scale. Whether we are integrating a large language model into a consumer product, designing an automated compliance workflow, or hardening an organisation's attack surface, our standard is the same: no shortcuts, no black boxes, no compromises on quality.
          </p>
        </div>

        <hr style={DIVIDER} />

        {/* Values */}
        <div style={{ marginBottom: 32 }}>
          <span style={LBL}>What we stand for</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
            {VALUES.map(v => (
              <div key={v} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#2563eb', flexShrink: 0, marginTop: 9 }} />
                <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.65, margin: 0 }}>{v}</p>
              </div>
            ))}
          </div>
        </div>

        <hr style={DIVIDER} />

        {/* CoParent Pay context */}
        <div style={{ marginBottom: 32 }}>
          <span style={LBL}>CoParent Pay</span>
          <p style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.8, margin: '0 0 14px' }}>
            CoParent Pay is one of our consumer applications — built to take the friction out of shared parenting expenses. It reflects everything we believe software should be: thoughtfully designed, secure by default, and genuinely useful in the moments that matter most.
          </p>
          <p style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.8, margin: 0 }}>
            From the two-step settlement approval workflow to the 7-day free trial, every decision in CoParent Pay was made with real co-parents in mind. It is not just a product we built — it is a product we stand behind.
          </p>
        </div>

        <hr style={DIVIDER} />

        {/* Contact */}
        <div>
          <span style={LBL}>Get in touch</span>
          <p style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.8, margin: '0 0 18px' }}>
            We work with startups, established businesses, and government organisations across Australia and beyond. If you have a product idea, a security challenge, or want to explore what AI could do for your organisation, we would love to hear from you.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 400 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6 }}>
              <EnvelopeIcon style={{ width: 17, height: 17, color: '#6b7280', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 1px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</p>
                <a href="mailto:info@xfiniti.com.au" style={{ fontSize: 13, fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}>info@xfiniti.com.au</a>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6 }}>
              <MapPinIcon style={{ width: 17, height: 17, color: '#6b7280', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 1px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Headquarters</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>Australia</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </Shell>
  )
}
