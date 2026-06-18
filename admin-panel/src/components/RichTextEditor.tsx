import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  value, 
  onChange
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: true }),
      Link.configure({ openOnClick: false }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync content when value changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  if (!editor) return null;

  const addImage = () => {
    const url = window.prompt('URL de l\'image:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const addLink = () => {
    const url = window.prompt('URL du lien:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    children,
    title
  }: { 
    onClick: () => void; 
    isActive?: boolean; 
    children: React.ReactNode;
    title?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg transition-colors ${
        isActive 
          ? 'bg-[var(--primary)] text-white' 
          : 'hover:bg-[var(--surface-light)] text-[var(--text-secondary)]'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="bg-[var(--surface-light)] p-2 flex flex-wrap gap-1 border-b border-[var(--border)]">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Gras"
        >
          <Bold size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italique"
        >
          <Italic size={18} />
        </ToolbarButton>
        
        <div className="w-px h-6 bg-[var(--border)] mx-1 self-center" />
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Titre 1"
        >
          <Heading1 size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Titre 2"
        >
          <Heading2 size={18} />
        </ToolbarButton>
        
        <div className="w-px h-6 bg-[var(--border)] mx-1 self-center" />
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Liste à puces"
        >
          <List size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Liste numérotée"
        >
          <ListOrdered size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Citation"
        >
          <Quote size={18} />
        </ToolbarButton>
        
        <div className="w-px h-6 bg-[var(--border)] mx-1 self-center" />
        
        <ToolbarButton onClick={addLink} title="Ajouter un lien">
          <LinkIcon size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={addImage} title="Ajouter une image">
          <ImageIcon size={18} />
        </ToolbarButton>
        
        <div className="flex-1" />
        
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Annuler">
          <Undo size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Rétablir">
          <Redo size={18} />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <div className="rich-text-editor-content">
        <EditorContent 
          editor={editor} 
        />
      </div>
      
      {/* Editor Styles */}
      <style>{`
        .rich-text-editor-content .ProseMirror {
          min-height: 300px;
          padding: 1rem;
          background: var(--surface-light);
          color: var(--text);
          outline: none;
        }
        .rich-text-editor-content .ProseMirror p {
          margin: 0.5rem 0;
        }
        .rich-text-editor-content .ProseMirror h1 {
          font-size: 1.75rem;
          font-weight: bold;
          margin: 1rem 0 0.5rem;
          color: var(--text);
        }
        .rich-text-editor-content .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: bold;
          margin: 1rem 0 0.5rem;
          color: var(--text);
        }
        .rich-text-editor-content .ProseMirror ul,
        .rich-text-editor-content .ProseMirror ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .rich-text-editor-content .ProseMirror li {
          margin: 0.25rem 0;
        }
        .rich-text-editor-content .ProseMirror blockquote {
          border-left: 3px solid var(--primary);
          padding-left: 1rem;
          margin: 1rem 0;
          color: var(--text-secondary);
          font-style: italic;
        }
        .rich-text-editor-content .ProseMirror a {
          color: var(--primary);
          text-decoration: underline;
        }
        .rich-text-editor-content .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }
        .rich-text-editor-content .ProseMirror strong {
          font-weight: bold;
        }
        .rich-text-editor-content .ProseMirror em {
          font-style: italic;
        }
        .rich-text-editor-content .ProseMirror p.is-editor-empty:first-child::before {
          content: 'Commencez à écrire votre article...';
          color: var(--text-muted);
          float: left;
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </div>
  );
};
