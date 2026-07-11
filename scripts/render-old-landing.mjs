import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import fs from 'node:fs';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const L = (p, n) => vite.ssrLoadModule(p).then(m => m[n]);
const [Hero, Types, Process, Truth, Pricing, FAQ, CTA, Footer] = await Promise.all([
  L('/src/components/landing/LandingHero.tsx', 'LandingHero'),
  L('/src/components/landing/LandingInterviewTypes.tsx', 'LandingInterviewTypes'),
  L('/src/components/landing/LandingProcess.tsx', 'LandingProcess'),
  L('/src/components/landing/LandingTruth.tsx', 'LandingTruth'),
  L('/src/components/landing/LandingPricing.tsx', 'LandingPricing'),
  L('/src/components/landing/LandingFAQ.tsx', 'LandingFAQ'),
  L('/src/components/landing/LandingCTA.tsx', 'LandingCTA'),
  L('/src/components/landing/LandingFooter.tsx', 'LandingFooter'),
]);
const e = React.createElement, noop = () => {};
const inner = e('div', { className: 'min-h-screen relative' },
  e(Hero, { onSignUp: noop }), e(Types), e(Process), e(Truth),
  e(Pricing, { onSignUp: noop }), e(FAQ), e(CTA, { onSignUp: noop }), e(Footer),
);
const body = renderToStaticMarkup(e(MemoryRouter, null, inner));
await vite.close();
const cssFile = fs.readdirSync('dist/assets').find(f => f.endsWith('.css'));
const css = fs.readFileSync(`dist/assets/${cssFile}`, 'utf8');
const html = `<!DOCTYPE html>\n<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>intrvue — previous landing page</title><style>${css}</style></head><body>${body}</body></html>`;
fs.writeFileSync('old-landing.html', html);
console.log('wrote old-landing.html —', (html.length/1024).toFixed(0), 'KB, body', (body.length/1024).toFixed(0), 'KB');
