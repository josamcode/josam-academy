import re,sys
css=open('josam-tokens.css').read()
def lum(h):
    h=h.lstrip('#'); r,g,b=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    f=lambda c: c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)
def cr(a,b):
    l1,l2=sorted([lum(a),lum(b)],reverse=True); return (l1+0.05)/(l2+0.05)
def block(theme):
    m=re.search(r'\[data-theme="%s"\]\s*\{(.*?)\n\}'%theme,css,re.S)
    return dict(re.findall(r'(--[a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})',m.group(1)))
fails=0
for theme in ('dark','light'):
    T=block(theme)
    BGS=['--bg-base','--bg-surface','--bg-elevated','--bg-inset']
    TEXT=['--text-primary','--text-secondary','--text-muted','--text-placeholder','--accent','--success','--warning','--danger','--info']
    for t in TEXT:
        for b in BGS:
            v=cr(T[t],T[b])
            if v<4.5: print(f"FAIL {theme} {t} on {b}: {v:.2f}"); fails+=1
    for a,b,need,lbl in [('--accent-foreground','--accent',4.5,'btn'),('--accent-foreground','--accent-hover',4.5,'btn hover'),
        ('--accent-foreground','--accent-pressed',4.5,'btn pressed'),('--accent','--accent-subtle',4.5,'chip'),
        ('--border-control','--bg-surface',3.0,'control border'),('--border-control','--bg-base',3.0,'control border'),
        ('--border-focus','--bg-base',3.0,'focus'),('--border-focus','--bg-surface',3.0,'focus')]:
        v=cr(T[a],T[b])
        if v<need: print(f"FAIL {theme} {lbl}: {a} on {b} = {v:.2f} (need {need})"); fails+=1
    for s in ('success','warning','danger','info','accent'):
        v=cr(T['--'+s],T['--%s-subtle'%s])
        if v<4.5: print(f"FAIL {theme} {s} on {s}-subtle: {v:.2f}"); fails+=1
    for i in range(1,7):
        v=cr(T['--chart-%d'%i],T['--bg-surface'])
        if v<3.0: print(f"FAIL {theme} chart-{i}: {v:.2f}"); fails+=1
print("TOKEN CONTRAST TEST:", "PASS — 0 failures" if fails==0 else f"{fails} FAILURES")
