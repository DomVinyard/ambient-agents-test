import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Typography from '@tiptap/extension-typography'
import Placeholder from '@tiptap/extension-placeholder'
import { Box, Flex, Button, ButtonGroup, useColorModeValue, Menu, MenuButton, MenuList, MenuItem, Text } from '@chakra-ui/react'
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Quote,
  ChevronDown
} from 'lucide-react'
import { useEffect } from 'react'
import TurndownService from 'turndown'
import { marked } from 'marked'
import './BeautifulMarkdownEditor.css'

// Configure marked for better HTML output
marked.setOptions({
  breaks: true,
  gfm: true
})

interface BeautifulMarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  height?: string
}

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  strongDelimiter: '**',
  emDelimiter: '_'
})

// Ensure headings are properly converted
turndownService.addRule('heading', {
  filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  replacement: function (content, node) {
    const hLevel = parseInt(node.nodeName.charAt(1))
    const hashes = '#'.repeat(hLevel)
    return '\n' + hashes + ' ' + content + '\n\n'
  }
})

// Ensure paragraphs don't get extra spacing
turndownService.addRule('paragraph', {
  filter: 'p',
  replacement: function (content) {
    return '\n\n' + content + '\n\n'
  }
})

export default function BeautifulMarkdownEditor({ 
  value, 
  onChange, 
  placeholder = "Start writing...",
  height = "500px"
}: BeautifulMarkdownEditorProps) {
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const toolbarBg = useColorModeValue('gray.50', 'gray.700')
  const editorBg = useColorModeValue('white', 'gray.800')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Typography,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      const markdown = turndownService.turndown(html)
      console.log('Converting HTML to Markdown:', { html, markdown })
      onChange(markdown)
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
        style: `min-height: ${height}; padding: 1rem;`,
        'data-placeholder': placeholder,
      },
    },
  })

  // Update editor content when value prop changes
  useEffect(() => {
    if (editor && value !== undefined) {
      const currentHtml = editor.getHTML()
      const currentMarkdown = turndownService.turndown(currentHtml)
      
      // Only update if the markdown content is actually different
      if (currentMarkdown.trim() !== value.trim()) {
        console.log('Loading markdown into editor:', { value, currentMarkdown })
        const html = marked(value) as string
        console.log('Converted to HTML:', html)
        editor.commands.setContent(html, false)
        
        // Scroll to top after content is loaded
        setTimeout(() => {
          const editorElement = editor.view.dom.closest('.beautiful-markdown-editor')
          if (editorElement) {
            editorElement.scrollTop = 0
          }
        }, 100)
      }
    }
  }, [editor, value])

  if (!editor) {
    return null
  }

  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    children, 
    title 
  }: { 
    onClick: () => void
    isActive?: boolean
    children: React.ReactNode
    title: string
  }) => (
    <Button
      size="sm"
      variant={isActive ? "solid" : "ghost"}
      colorScheme={isActive ? "blue" : "gray"}
      onMouseDown={(e) => {
        e.preventDefault() // Prevent focus loss
        onClick()
      }}
      title={title}
      minW="auto"
      px={2}
      py={1}
      height="32px"
    >
      {children}
    </Button>
  )

  return (
    <Box
      border="1px solid"
      borderColor={borderColor}
      borderRadius="lg"
      overflow="hidden"
      bg={editorBg}
      height="100%"
      position="relative"
    >
      {/* Editor */}
      <Box 
        height="100%" 
        overflow="auto" 
        className="beautiful-markdown-editor"
        minH="0"
      >
        <EditorContent 
          editor={editor}
          style={{ 
            height: '100%',
            minHeight: '400px'
          }}
        />
        
        {/* Floating Bubble Menu */}
        <BubbleMenu
          editor={editor}
          tippyOptions={{ 
            duration: 100,
            placement: 'top',
            animation: 'shift-away',
            theme: 'bubble-menu',
          }}
        >
          <Flex
            bg="white"
            border="1px solid"
            borderColor="gray.300"
            borderRadius="lg"
            shadow="lg"
            px={2}
            py={1}
            gap={1}
            alignItems="center"
            flexWrap="nowrap"
          >
            <ButtonGroup size="sm" spacing={1}>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive('bold')}
                title="Bold"
              >
                <Bold size={14} />
              </ToolbarButton>
              
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive('italic')}
                title="Italic"
              >
                <Italic size={14} />
              </ToolbarButton>
            </ButtonGroup>

            <Box w="1px" h="20px" bg="gray.300" mx={1} />

            <Menu>
              <MenuButton
                as={Button}
                size="sm"
                variant="ghost"
                rightIcon={<ChevronDown size={10} />}
                minW="auto"
                px={2}
                py={1}
                height="28px"
                fontSize="xs"
              >
                {editor.isActive('heading', { level: 1 }) ? 'H1' :
                 editor.isActive('heading', { level: 2 }) ? 'H2' :
                 editor.isActive('heading', { level: 3 }) ? 'H3' : 'T'}
              </MenuButton>
              <MenuList>
                <MenuItem 
                  onClick={() => {
                    editor.chain().focus().clearNodes().run()
                    editor.chain().focus().setParagraph().run()
                  }}
                  bg={(!editor.isActive('heading', { level: 1 }) && 
                       !editor.isActive('heading', { level: 2 }) && 
                       !editor.isActive('heading', { level: 3 })) ? 'blue.50' : 'transparent'}
                >
                  <Text fontSize="sm">Normal Text</Text>
                </MenuItem>
                <MenuItem 
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  bg={editor.isActive('heading', { level: 1 }) ? 'blue.50' : 'transparent'}
                >
                  <Text fontSize="xl" fontWeight="bold">Heading 1</Text>
                </MenuItem>
                <MenuItem 
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  bg={editor.isActive('heading', { level: 2 }) ? 'blue.50' : 'transparent'}
                >
                  <Text fontSize="lg" fontWeight="semibold">Heading 2</Text>
                </MenuItem>
                <MenuItem 
                  onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                  bg={editor.isActive('heading', { level: 3 }) ? 'blue.50' : 'transparent'}
                >
                  <Text fontSize="md" fontWeight="medium">Heading 3</Text>
                </MenuItem>
              </MenuList>
            </Menu>

            <Box w="1px" h="20px" bg="gray.300" mx={1} />

            <ButtonGroup size="sm" spacing={1}>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive('bulletList')}
                title="Bullet List"
              >
                <List size={14} />
              </ToolbarButton>
              
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive('orderedList')}
                title="Numbered List"
              >
                <ListOrdered size={14} />
              </ToolbarButton>
              
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                isActive={editor.isActive('blockquote')}
                title="Quote"
              >
                <Quote size={14} />
              </ToolbarButton>
            </ButtonGroup>
          </Flex>
        </BubbleMenu>
      </Box>
    </Box>
  )
} 