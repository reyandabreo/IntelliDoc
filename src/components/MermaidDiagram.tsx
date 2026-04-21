import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  code: string;
}

mermaid.initialize({
  startOnLoad: true,
  theme: 'base',
  themeVariables: {
    primaryColor: '#f4f4f5',
    primaryTextColor: '#18181b',
    primaryBorderColor: '#e4e4e7',
    lineColor: '#3f3f46',
    secondaryColor: '#fafafa',
    tertiaryColor: '#ffffff',
  },
  securityLevel: 'loose',
});

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ code }) => {
  const ref = useRef<HTMLDivElement>(null);
  const id = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    const renderDiagram = async () => {
      if (ref.current && code) {
        try {
          // Defensive sanitization for AI-generated code
          let sanitizedCode = code
            .replace(/;/g, '\n') // Replace semicolons with newlines for reliability
            .replace(/\bSubgraph\b/g, 'subgraph') // Fix common capitalization error
            .replace(/\bEnd\b/g, 'end') // Fix common capitalization error
            .replace(/\bGraph\b/g, 'graph') // Fix common capitalization error
            // Fix missing space: "graph tdA1" -> "graph TD\nA1"
            .replace(/graph\s+(TD|LR|TB|BT|RL)([A-Z0-9])/gi, (match, dir, firstChar) => {
              return `graph ${dir.toUpperCase()}\n${firstChar}`;
            });

          const { svg } = await mermaid.render(id.current, sanitizedCode);
          ref.current.innerHTML = svg;
        } catch (error) {
          console.error('Mermaid render error:', error);
          ref.current.innerHTML = '<div class="text-red-500 p-4 border border-red-200 rounded italic text-sm">Failed to render diagram. Check mermaid syntax.</div>';
        }
      }
    };
    renderDiagram();
  }, [code]);

  return (
    <div className="flex flex-col items-center my-8 overflow-x-auto w-full p-6 bg-white rounded-xl border border-zinc-200 shadow-sm">
      <div key={code} className="w-full flex justify-center" ref={ref} />
    </div>
  );
};
