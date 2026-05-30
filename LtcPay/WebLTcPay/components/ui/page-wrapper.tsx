import React from "react";

interface PageWrapperProps {
  crumb?: React.ReactNode[];
  title: React.ReactNode;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function PageWrapper({ crumb, title, sub, actions, children }: PageWrapperProps) {
  return (
    <div className="page">
      <header className="page-head">
        <div>
          {crumb && (
            <div className="crumb">
              {crumb.map((c, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="sep">/</span>}
                  <span>{c}</span>
                </React.Fragment>
              ))}
            </div>
          )}
          <h1>{title}</h1>
          {sub && <p className="sub">{sub}</p>}
        </div>
        {actions && <div className="actions">{actions}</div>}
      </header>
      {children}
    </div>
  );
}
