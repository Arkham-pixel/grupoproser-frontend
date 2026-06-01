import React, { useState, useEffect, useRef, useCallback } from "react";
import { Editor } from "react-draft-wysiwyg";
import { EditorState, convertToRaw } from "draft-js";
import draftToHtml from "draftjs-to-html";
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";

export default function RecomendacionesObservacionesMaquinaria({ recomendaciones, setRecomendaciones }) {
  const [editorState, setEditorState] = useState(() => EditorState.createEmpty());
  const isMounted = useRef(false);
  const [isClient, setIsClient] = useState(false); // Detecta si ya estamos en el cliente (navegador)
  const ultimoHtmlRef = useRef("");

  useEffect(() => {
    isMounted.current = true;
    setIsClient(true);
    return () => {
      isMounted.current = false;
    };
  }, []);

  const sincronizarRecomendaciones = useCallback((state) => {
    const rawContent = convertToRaw(state.getCurrentContent());
    const html = draftToHtml(rawContent);

    // Evita escrituras repetidas al estado del padre que fuerzan re-render innecesario
    // y pueden afectar la posición del cursor en editores ricos.
    if (isMounted.current && html !== ultimoHtmlRef.current) {
      ultimoHtmlRef.current = html;
      setRecomendaciones(html);
    }
  }, [setRecomendaciones]);

  const handleEditorStateChange = useCallback((state) => {
    setEditorState(state);
  }, []);

  const handleEditorBlur = useCallback(() => {
    sincronizarRecomendaciones(editorState);
  }, [editorState, sincronizarRecomendaciones]);

  return (
    <div className="mb-6">
      <h2 className="text-white text-sm font-bold mb-2">4. RECOMENDACIONES Y OBSERVACIONES</h2>
      {isClient && (
        <div className="bg-white rounded p-2">
          <Editor
            editorState={editorState}
            onEditorStateChange={handleEditorStateChange}
            onBlur={handleEditorBlur}
            toolbar={{
              options: ["inline", "list", "textAlign", "history"],
              list: { inDropdown: false },
            }}
            editorClassName="px-3 py-2 bg-gray-900 text-white text-xs"
            toolbarClassName="mb-2"
            wrapperClassName="border border-white rounded"
          />
        </div>
      )}
    </div>
  );
}
