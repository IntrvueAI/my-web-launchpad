import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ send: vi.fn(), verify: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ sendSignInCode: mocks.send, verifySignInCode: mocks.verify }) }));
import { EmailCodeSignIn } from './EmailCodeSignIn';
let root: Root, node: HTMLDivElement;
beforeEach(() => {
  Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});
  vi.resetAllMocks();
  mocks.send.mockResolvedValue({error:null}); mocks.verify.mockResolvedValue({error:null});
  node=document.createElement('div'); document.body.append(node); root=createRoot(node);
  act(()=>root.render(<EmailCodeSignIn/>));
});
afterEach(()=>{ act(()=>root.unmount()); node.remove(); });
async function input(id:string,value:string) {
  const el=node.querySelector<HTMLInputElement>('#'+id)!;
  await act(async()=>Simulate.change(el,{target:{value}} as any));
}
async function submit() { await act(async()=>Simulate.submit(node.querySelector('form')!)); }
describe('Email code sign-in',()=>{
  it('keeps the email form available when delivery fails',async()=>{
    mocks.send.mockResolvedValue({error:{status:500,code:'unexpected_failure'}});
    await input('code-email','existing@example.test'); await submit();
    expect(node.textContent).toContain('Email delivery is temporarily unavailable');
    expect(node.querySelector('#code-email')).not.toBeNull();
    expect(node.querySelector('#signin-code')).toBeNull();
  });
  it('does not reveal whether an email is registered',async()=>{
    mocks.send.mockResolvedValue({error:{code:'signups_not_allowed'}});
    await input('code-email','unknown@example.test');await submit();
    expect(node.textContent).toContain('If an account exists');
    expect(node.querySelector('#signin-code')).not.toBeNull();
  });
  it('prevents immediate resends and verifies the code against the original address',async()=>{
    await input('code-email','existing@example.test');await submit();
    const resend=Array.from(node.querySelectorAll('button')).find(b=>b.textContent?.includes('Resend'))!;
    expect(resend.disabled).toBe(true);
    await input('signin-code','123456');await submit();
    expect(mocks.verify).toHaveBeenCalledWith('existing@example.test','123456');
  });
  it('explains invalid codes while allowing correction',async()=>{
    mocks.verify.mockResolvedValue({error:{code:'otp_expired'}});
    await input('code-email','existing@example.test');await submit();await input('signin-code','123456');await submit();
    expect(node.textContent).toContain('incorrect or has expired');
    expect(node.querySelector('#signin-code')).not.toBeNull();
  });
});
