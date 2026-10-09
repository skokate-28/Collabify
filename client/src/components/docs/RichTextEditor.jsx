import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import FontFamily from '@tiptap/extension-font-family';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Typography from '@tiptap/extension-typography';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Highlighter,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered,
  Table as TableIcon, Minus, Undo2, Redo2,
} from 'lucide-react';
import { FontSize, LineHeight } from './tiptapExtensions';

export const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };

export function normalizeEditorContent(content) {
  if (!content) return EMPTY_DOC;
  if (typeof content === 'object' && content.type === 'doc') return content;
  if (typeof content === 'string') {
    const text = content.trim();
    if (!text) return EMPTY_DOC;
    return {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: content }] }],
    };
  }
  return EMPTY_DOC;
}

function ToolbarButton({ active, disabled, onClick, title, children }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`p-1.5 rounded-md transition-colors ${
        active ? 'bg-indigoAccent text-white' : 'text-gray-400 hover:text-white hover:bg-darkInput'
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-darkBorder mx-1 flex-shrink-0" />;
}

export default function RichTextEditor({ content, onChange, editable = true }) {
  const isRemoteRef = useRef(false);
  const [tableMenu, setTableMenu] = useState(null);
  const [showTableGrid, setShowTableGrid] = useState(false);
  const [gridHover, setGridHover] = useState({ rows: 0, cols: 0 });
  const [fontSize, setFontSize] = useState(16);
  const [, setTick] = useState(0);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      FontFamily,
      FontSize,
      LineHeight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Typography,
    ],
    []
  );

  const editor = useEditor({
    extensions,
    content: normalizeEditorContent(content),
    editable,
    editorProps: {
      attributes: {
        class: 'tiptap-editor outline-none min-h-full px-8 py-6 max-w-4xl mx-auto',
      },
      handleDOMEvents: {
        contextmenu: (view, event) => {
          const target = event.target;
          if (target?.closest?.('table')) {
            event.preventDefault();
            setTableMenu({ x: event.clientX, y: event.clientY });
            return true;
          }
          setTableMenu(null);
          return false;
        },
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (isRemoteRef.current) {
        isRemoteRef.current = false;
        return;
      }
      onChange?.(ed.getJSON());
    },
    onSelectionUpdate: () => setTick((n) => n + 1),
    onTransaction: () => setTick((n) => n + 1),
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor || content === undefined) return;
    const incoming = normalizeEditorContent(content);
    const current = JSON.stringify(editor.getJSON());
    if (JSON.stringify(incoming) !== current) {
      isRemoteRef.current = true;
      editor.commands.setContent(incoming, false);
    }
  }, [content, editor]);

  useEffect(() => {
    const close = () => {
      setTableMenu(null);
      setShowTableGrid(false);
    };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const insertTable = useCallback(
    (rows, cols) => {
      editor?.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
      setShowTableGrid(false);
    },
    [editor]
  );

  if (!editor) return null;

  const headingValue = editor.isActive('heading', { level: 1 })
    ? 'h1'
    : editor.isActive('heading', { level: 2 })
      ? 'h2'
      : editor.isActive('heading', { level: 3 })
        ? 'h3'
        : 'p';

  const currentFont = editor.getAttributes('textStyle').fontFamily || 'Inter';
  const currentLine = editor.getAttributes('paragraph').lineHeight || editor.getAttributes('heading').lineHeight || '1.5';

  return (
    <div className="flex flex-col h-full min-h-0">
      {editable && (
        <div className="flex items-center gap-0.5 px-3 py-2 border-b border-darkBorder bg-darkSurface flex-shrink-0 overflow-x-auto sticky top-0 z-10">
          <ToolbarButton title="Undo (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
            <Undo2 size={15} />
          </ToolbarButton>
          <ToolbarButton title="Redo (Ctrl+Y)" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
            <Redo2 size={15} />
          </ToolbarButton>

          <Divider />

          <select
            value={headingValue}
            onChange={(e) => {
              const v = e.target.value;
              if (v === 'p') editor.chain().focus().setParagraph().run();
              else editor.chain().focus().toggleHeading({ level: Number(v.replace('h', '')) }).run();
            }}
            className="bg-darkInput border border-darkBorder text-gray-200 text-[11px] rounded-md px-2 py-1 focus:outline-none focus:border-indigoAccent"
          >
            <option value="p">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
          </select>

          <select
            value={currentFont}
            onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
            className="bg-darkInput border border-darkBorder text-gray-200 text-[11px] rounded-md px-2 py-1 focus:outline-none focus:border-indigoAccent ml-1"
          >
            <option value="Inter">Inter</option>
            <option value="Georgia">Georgia</option>
            <option value="'Courier New', monospace">Courier New</option>
            <option value="Arial">Arial</option>
          </select>

          <input
            type="number"
            min={8}
            max={72}
            value={parseInt(editor.getAttributes('textStyle').fontSize, 10) || fontSize}
            onChange={(e) => {
              const val = Math.min(72, Math.max(8, Number(e.target.value) || 16));
              setFontSize(val);
              editor.chain().focus().setFontSize(`${val}px`).run();
            }}
            className="w-14 bg-darkInput border border-darkBorder text-gray-200 text-[11px] rounded-md px-1.5 py-1 ml-1 focus:outline-none focus:border-indigoAccent"
            title="Font size"
          />

          <Divider />

          <ToolbarButton title="Bold (Ctrl+B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold size={15} />
          </ToolbarButton>
          <ToolbarButton title="Italic (Ctrl+I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic size={15} />
          </ToolbarButton>
          <ToolbarButton title="Underline (Ctrl+U)" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <UnderlineIcon size={15} />
          </ToolbarButton>
          <ToolbarButton title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
            <Strikethrough size={15} />
          </ToolbarButton>
          <ToolbarButton title="Highlight" active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight({ color: '#FACC15' }).run()}>
            <Highlighter size={15} />
          </ToolbarButton>
          <label title="Text color" className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-darkInput cursor-pointer flex items-center">
            <input
              type="color"
              className="w-4 h-4 cursor-pointer bg-transparent border-0 p-0"
              value={editor.getAttributes('textStyle').color || '#e2e8f0'}
              onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            />
          </label>

          <Divider />

          <ToolbarButton title="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
            <AlignLeft size={15} />
          </ToolbarButton>
          <ToolbarButton title="Align center" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
            <AlignCenter size={15} />
          </ToolbarButton>
          <ToolbarButton title="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
            <AlignRight size={15} />
          </ToolbarButton>
          <ToolbarButton title="Justify" active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
            <AlignJustify size={15} />
          </ToolbarButton>

          <Divider />

          <ToolbarButton title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List size={15} />
          </ToolbarButton>
          <ToolbarButton title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered size={15} />
          </ToolbarButton>

          <Divider />

          <select
            value={currentLine}
            onChange={(e) => editor.chain().focus().setLineHeight(e.target.value).run()}
            className="bg-darkInput border border-darkBorder text-gray-200 text-[11px] rounded-md px-2 py-1 focus:outline-none focus:border-indigoAccent"
            title="Line spacing"
          >
            <option value="1">Single (1.0)</option>
            <option value="1.5">1.5</option>
            <option value="2">Double (2.0)</option>
          </select>

          <Divider />

          <div className="relative">
            <ToolbarButton
              title="Insert table"
              onClick={(e) => {
                e.stopPropagation();
                setShowTableGrid((v) => !v);
              }}
            >
              <TableIcon size={15} />
            </ToolbarButton>
            {showTableGrid && (
              <div
                className="absolute left-0 top-full mt-1 z-30 bg-darkSurface border border-darkBorder rounded-lg p-2 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="grid grid-cols-8 gap-0.5">
                  {Array.from({ length: 64 }).map((_, i) => {
                    const r = Math.floor(i / 8) + 1;
                    const c = (i % 8) + 1;
                    const active = r <= gridHover.rows && c <= gridHover.cols;
                    return (
                      <button
                        key={i}
                        type="button"
                        onMouseEnter={() => setGridHover({ rows: r, cols: c })}
                        onClick={() => insertTable(r, c)}
                        className={`w-4 h-4 rounded-sm border ${
                          active ? 'bg-indigoAccent border-indigoAccent' : 'bg-darkInput border-darkBorder'
                        }`}
                      />
                    );
                  })}
                </div>
                <p className="text-[10px] text-gray-500 text-center mt-1.5">
                  {gridHover.rows} x {gridHover.cols}
                </p>
              </div>
            )}
          </div>

          <ToolbarButton title="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
            <Minus size={15} />
          </ToolbarButton>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0 bg-darkBg">
        <EditorContent editor={editor} />
      </div>

      {tableMenu && editor.isActive('table') && (
        <div
          className="fixed z-50 bg-darkSurface border border-darkBorder rounded-lg py-1 w-44 shadow-2xl"
          style={{ left: tableMenu.x, top: tableMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {[
            ['Add Row Above', () => editor.chain().focus().addRowBefore().run()],
            ['Add Row Below', () => editor.chain().focus().addRowAfter().run()],
            ['Add Column Left', () => editor.chain().focus().addColumnBefore().run()],
            ['Add Column Right', () => editor.chain().focus().addColumnAfter().run()],
            ['Delete Row', () => editor.chain().focus().deleteRow().run()],
            ['Delete Column', () => editor.chain().focus().deleteColumn().run()],
            ['Delete Table', () => editor.chain().focus().deleteTable().run()],
          ].map(([label, action]) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                action();
                setTableMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-darkInput"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
