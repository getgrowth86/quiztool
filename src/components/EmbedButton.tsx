'use client';

import { useState } from 'react';

interface Props {
  formId: string;
}

export default function EmbedButton({ formId }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';

  const iframeCode = `<iframe
  src="${origin}/embed/${formId}"
  style="width:100%;height:600px;border:none;border-radius:12px;"
  allow="clipboard-write"
></iframe>`;

  const autoResizeCode = `<!-- FormFlow Embed with Auto-Resize -->
<iframe
  id="formflow-${formId}"
  src="${origin}/embed/${formId}"
  style="width:100%;border:none;border-radius:12px;"
  height="600"
  allow="clipboard-write"
></iframe>
<script>
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'formflow:resize') {
      var iframe = document.getElementById('formflow-${formId}');
      if (iframe) iframe.height = e.data.height + 'px';
    }
  });
</script>`;

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg transition-colors font-medium"
      >
        {'</>'}  Embed
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">In Funnelcockpit einbetten</h2>
                <p className="text-sm text-gray-500 mt-0.5">Kopiere den Code in ein HTML-Element in Funnelcockpit</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1">×</button>
            </div>

            <div className="p-6 space-y-5">
              {/* Step 1 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full text-xs font-bold flex items-center justify-center">1</span>
                  <span className="text-sm font-semibold text-gray-700">Einfaches iFrame (feste Höhe)</span>
                </div>
                <div className="relative">
                  <pre className="bg-gray-900 text-green-300 text-xs p-4 rounded-xl overflow-x-auto font-mono leading-relaxed">
                    {iframeCode}
                  </pre>
                  <button
                    onClick={() => copy(iframeCode)}
                    className="absolute top-3 right-3 bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {copied ? '✓ Kopiert!' : 'Kopieren'}
                  </button>
                </div>
              </div>

              {/* Step 2 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full text-xs font-bold flex items-center justify-center">2</span>
                  <span className="text-sm font-semibold text-gray-700">Mit Auto-Resize (empfohlen)</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Empfohlen</span>
                </div>
                <div className="relative">
                  <pre className="bg-gray-900 text-green-300 text-xs p-4 rounded-xl overflow-x-auto font-mono leading-relaxed">
                    {autoResizeCode}
                  </pre>
                  <button
                    onClick={() => copy(autoResizeCode)}
                    className="absolute top-3 right-3 bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {copied ? '✓ Kopiert!' : 'Kopieren'}
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
                <p className="font-semibold mb-2">So gehts in Funnelcockpit:</p>
                <ol className="space-y-1 list-decimal list-inside text-blue-700">
                  <li>Öffne deine Funnel-Seite in Funnelcockpit</li>
                  <li>Füge ein <strong>HTML-Element</strong> / <strong>Custom Code Block</strong> ein</li>
                  <li>Füge den Code oben ein und speichere</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
