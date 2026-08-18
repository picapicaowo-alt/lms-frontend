import React, {useEffect, useState} from 'react';
import {useEditor, EditorContent} from '@tiptap/react';
import Toolbar from './Toolbar';
import styles from './index.module.scss';
// The extension list lives beside this file so it can be checked without
// mounting an editor — see extensions.test.ts.
import {createEditorExtensions} from './extensions';

interface TextBlockProps {
  content?: string;
  disabled?: boolean;
  placeholder?: string;
  onChange?: (content: string) => void;
  onMouseUp?: () => void;
  registerRef?: (index: number, ref: HTMLElement | null) => void;
  index?: number;
  adjustHeight?: (index: number) => void;
  showToolbar?: boolean;
  defaultToolbarVisible?: boolean;
}

export const RichTextEditor: React.FC<TextBlockProps> = (props) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setShouldRender(true);
    const frame = requestAnimationFrame(() => setIsInitialized(true));

    // Cancel it on unmount. Left pending, the callback sets state on a
    // component that is already gone, and React reports it as unmounting a
    // root mid-render.
    return () => cancelAnimationFrame(frame);
  }, []);
  
  if (!shouldRender) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingPlaceholder}>
          Loading editor...
        </div>
      </div>
    );
  }
  
  if (!isInitialized) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingPlaceholder}>
          Loading editor...
        </div>
      </div>
    );
  }
  
  return <RichTextEditorClient {...props} />;
};

const RichTextEditorClient: React.FC<TextBlockProps> = ({
                                                          content = '',
                                                          disabled = false,
                                                          placeholder = 'Start writing your content here...',
                                                          onChange,
                                                          onMouseUp,
                                                          registerRef,
                                                          index = 0,
                                                          adjustHeight,
                                                          showToolbar = true,
                                                          defaultToolbarVisible = true,
                                                        }) => {
  
  const [toolbarVisible, setToolbarVisible] = React.useState(defaultToolbarVisible);
  
  const editor = useEditor({
    extensions: createEditorExtensions({placeholder, disabled}),
    content,
    editable: !disabled,
    onUpdate: ({editor}) => {
      const md = editor.getText();
      onChange?.(md);
    },
    onSelectionUpdate: ({editor}) => {
      if (onMouseUp && editor.state.selection.empty === false) {
        onMouseUp();
      }
    },
    editorProps: {
      attributes: {
        class: styles.editor,
        'data-testid': 'text-block-editor',
        spellcheck: 'true',
      },
      // No `mode` here. editorProps is ProseMirror's own options object and
      // ignores unknown keys, so this never reached anything — BlankNode is
      // the extension that takes a mode, and it receives one directly.
    },
  });
  
  useEffect(() => {
    if (editor && registerRef) {
      const element = editor.view.dom;
      registerRef(index, element);
      return () => {
        registerRef(index, null);
      };
    }
  }, [editor, registerRef, index]);
  
  useEffect(() => {
    if (editor && adjustHeight) {
      requestAnimationFrame(() => {
        adjustHeight(index);
      });
    }
  }, [editor?.getHTML(), adjustHeight, index]);
  
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);
  
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);
  
  useEffect(() => {
    if (!editor) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        editor.chain().focus().toggleBold().run();
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'i') {
        event.preventDefault();
        editor.chain().focus().toggleItalic().run();
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'u') {
        event.preventDefault();
        editor.chain().focus().toggleUnderline().run();
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('Input Link', previousUrl);
        
        if (url === null) return;
        if (url === '') {
          editor.chain().focus().extendMarkRange('link').unsetLink().run();
          return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({href: url}).run();
      }
    };
    
    editor.view.dom.addEventListener('keydown', handleKeyDown);
    return () => {
      editor.view.dom.removeEventListener('keydown', handleKeyDown);
    };
  }, [editor]);
  
  return (
    <div className={`${styles.container} ${disabled ? styles.disabled : ''}`}>
      {showToolbar && editor && (
        <Toolbar 
          editor={editor} 
          disabled={disabled} 
          toolbarVisible={toolbarVisible}
          toggleToolbar={() => setToolbarVisible(!toolbarVisible)}
        />
      )}
      <EditorContent editor={editor}/>
    </div>
  );
};