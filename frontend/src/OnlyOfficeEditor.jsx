import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Componente OnlyOfficeEditor
 * Integra el SDK de OnlyOffice (DocsAPI) en una aplicación React.
 * Renderizado como portal para evitar conflictos de validación DOM con React.
 */
const OnlyOfficeEditor = ({ config, onBack }) => {
    const editorRef = useRef(null);
    
    if (!config || !config.document || !config.editorConfig) {
        console.error("Configuración incompleta:", config);
        return createPortal(
            <div style={{ padding: 40, color: 'white', textAlign: 'center' }}>
                <h2>Error de configuración</h2>
                <p>El editor no puede abrirse.</p>
                <button onClick={onBack} style={{ background: '#6366f1', color: 'white', border: 'none', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer' }}>Volver</button>
            </div>,
            document.body
        );
    }
    useEffect(() => {
        let retries = 0;
        let timer;

        const initEditor = () => {
            // Buscamos el SDK en el objeto window (DocEditor o DocsAPI)
            const SDK = window.DocEditor || (window.DocsAPI ? window.DocsAPI.DocEditor : null);

            if (SDK) {
                // Si ya existe una instancia activa, la destruimos antes de recrearla
                if (editorRef.current) {
                    try { 
                        editorRef.current.destroyEditor(); 
                    } catch (e) {
                        console.warn("No se pudo destruir la instancia previa:", e);
                    }
                }
                
                try {
                    // Forzamos que la configuración use el 100% del contenedor
                    const fullConfig = {
                        ...config,
                        width: '100%',
                        height: '100%',
                        editorConfig: {
                            ...config.editorConfig,
                            width: '100%',
                            height: '100%',
                        }
                    };
                    
                    // Inicialización en el div con id="placeholder"
                    editorRef.current = new SDK("placeholder", fullConfig);
                } catch (error) {
                    console.error("Error al inicializar OnlyOffice:", error);
                }
            } else if (retries < 10) {
                // Si el script de OnlyOffice aún no carga, reintentamos cada 500ms
                retries++;
                timer = setTimeout(initEditor, 500);
            }
        };

        // Inicio diferido de la inicialización
        timer = setTimeout(initEditor, 100);

        // Limpieza al desmontar el componente
        return () => {
            if (timer) clearTimeout(timer);
            if (editorRef.current) {
                try {
                    editorRef.current.destroyEditor();
                } catch (e) {}
                editorRef.current = null;
            }
        };
    }, [config]);

    return createPortal(
        <div style={styles.container}>
            {/* Barra de herramientas superior */}
            <div style={styles.toolbar}>
                <button onClick={onBack} style={styles.backButton}>
                    ← Volver a MENELEC
                </button>
                <div style={styles.infoWrapper}>
                    <span style={styles.fileName}>
                        Archivo: <strong style={{color: '#fff'}}>{config.document.title}</strong>
                    </span>
                    <span style={styles.badge}>
                        {config.document.fileType?.toUpperCase()}
                    </span>
                </div>
            </div>

            {/* Contenedor del Editor */}
            <div style={styles.editorWrapper}>
                <div id="placeholder"></div>
            </div>
        </div>,
        document.body
    );
};

// Estilos integrados (CSS-in-JS)
const styles = {
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0f172a',
        zIndex: 1000,
    },
    toolbar: {
        padding: '10px 20px',
        background: '#1e293b',
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid #334155',
        minHeight: '55px'
    },
    backButton: {
        background: '#6366f1',
        color: 'white',
        border: 'none',
        padding: '8px 18px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: '700',
        fontSize: '12px',
        transition: 'all 0.2s',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
    },
    infoWrapper: {
        marginLeft: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    },
    fileName: {
        color: '#94a3b8',
        fontSize: '14px'
    },
    badge: {
        background: 'rgba(99, 102, 241, 0.2)',
        color: '#818cf8',
        padding: '2px 10px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: 'bold',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        textTransform: 'uppercase'
    },
    editorWrapper: {
        flex: 1,
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#1e293b'
    }
};

export default OnlyOfficeEditor;