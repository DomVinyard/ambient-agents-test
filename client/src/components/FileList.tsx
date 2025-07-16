import {
  Box,
  VStack,
  HStack,
  Text,
  List,
  ListItem,
  Badge,
  Flex,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  Divider,
} from "@chakra-ui/react";
import { FileText, Trash2 } from "lucide-react";
import { useState } from "react";
import { FileItem } from "../types";
import EmptyState from "./EmptyState";
import {
  getCategory,
  getCategoryWithEmoji,
  isCompiledCategory,
  isGeneratedCategory,
  COMPILED_CATEGORIES,
  GENERATED_CATEGORIES,
} from "../utils/categories";

interface FileListProps {
  files: Record<string, FileItem>;
  selectedFile: FileItem | null;
  onFileSelect: (fileName: string) => void;
  onDeleteFile: (fileName: string) => void;
  onDeleteAll: () => void;
  onCompileProfile: () => void;
  isCompiling: boolean;
}

export default function FileList({
  files,
  selectedFile,
  onFileSelect,
  onDeleteFile,
  onDeleteAll,
  onCompileProfile,
  isCompiling,
}: FileListProps) {
  const [contextMenuFile, setContextMenuFile] = useState<string | null>(null);

  const fileEntries = Object.entries(files);

  // Group and sort files by type
  const compiledFiles = fileEntries
    .filter(([fileName]) => isCompiledCategory(getCategory(fileName)))
    .sort(([fileNameA], [fileNameB]) => {
      const categoryA = getCategory(fileNameA);
      const categoryB = getCategory(fileNameB);
      return (
        COMPILED_CATEGORIES.indexOf(categoryA) -
        COMPILED_CATEGORIES.indexOf(categoryB)
      );
    });

  const generatedFiles = fileEntries
    .filter(([fileName]) => isGeneratedCategory(getCategory(fileName)))
    .sort(([fileNameA], [fileNameB]) => {
      const categoryA = getCategory(fileNameA);
      const categoryB = getCategory(fileNameB);
      return (
        GENERATED_CATEGORIES.indexOf(categoryA) -
        GENERATED_CATEGORIES.indexOf(categoryB)
      );
    });

  const handleRightClick = (e: React.MouseEvent, fileName: string) => {
    e.preventDefault();
    setContextMenuFile(fileName);
  };

  const handleDeleteFile = (fileName: string) => {
    const category = getCategory(fileName);
    if (
      window.confirm(
        `Are you sure you want to delete ${getCategoryWithEmoji(
          category
        )}.md? This action cannot be undone.`
      )
    ) {
      onDeleteFile(fileName);
    }
    setContextMenuFile(null);
  };

  const renderFileSection = (files: [string, FileItem][], title: string) => (
    <>
      <Box px={3} py={2} bg="gray.100">
        <Text
          fontSize="xs"
          fontWeight="semibold"
          color="gray.600"
          textTransform="uppercase"
          letterSpacing="wider"
        >
          {title}
        </Text>
      </Box>
      {files.map(([fileName, file]) => {
        const category = getCategory(fileName);
        const isSelected = selectedFile?.name === fileName;

        return (
          <Menu
            key={fileName}
            isOpen={contextMenuFile === fileName}
            onClose={() => setContextMenuFile(null)}
            placement="right-start"
          >
            <MenuButton
              as={ListItem}
              p={3}
              borderBottom="1px solid"
              borderColor="gray.100"
              cursor="pointer"
              bg={isSelected ? "blue.50" : "white"}
              _hover={{ bg: isSelected ? "blue.50" : "gray.50" }}
              _active={{}}
              onClick={() => onFileSelect(fileName)}
              onContextMenu={(e) => handleRightClick(e, fileName)}
            >
              <Flex justify="space-between" align="center" mb={1}>
                <Text
                  fontSize="sm"
                  fontWeight="medium"
                  color="gray.800"
                  noOfLines={1}
                  flex="1"
                >
                  {getCategoryWithEmoji(category)}
                </Text>
                <Badge colorScheme="gray" size="sm" ml={2}>
                  .md
                </Badge>
              </Flex>
              <Text fontSize="xs" color="gray.500">
                Updated {file.lastModified.toLocaleDateString()}
              </Text>
            </MenuButton>
            <MenuList>
              <MenuItem
                icon={<Trash2 size={16} />}
                onClick={() => handleDeleteFile(fileName)}
                color="red.600"
              >
                Delete {getCategoryWithEmoji(category)}.md
              </MenuItem>
            </MenuList>
          </Menu>
        );
      })}
    </>
  );

  return (
    <Box
      flex="1"
      h="100%"
      bg="gray.50"
      borderRight="1px solid"
      borderColor="gray.300"
    >
      <VStack spacing={0} h="100%">
        {/* Action Buttons */}
        {fileEntries.length > 0 && (
          <Box p={2} w="100%">
            <HStack spacing={1}>
              <Button
                size="xs"
                variant="outline"
                colorScheme="red"
                onClick={onDeleteAll}
                flex="1"
                fontSize="xs"
              >
                Delete All
              </Button>
              <Button
                size="xs"
                variant="outline"
                colorScheme="purple"
                onClick={onCompileProfile}
                flex="1"
                fontSize="xs"
                isLoading={isCompiling}
                loadingText="Compiling..."
              >
                Compile
              </Button>
            </HStack>
          </Box>
        )}

        {/* Content */}
        <Box
          flex="1"
          w="100%"
          overflowY="auto"
          pt={fileEntries.length > 0 ? 0 : 4}
        >
          {fileEntries.length === 0 ? (
            <Box mt="50%">
              <EmptyState
                icon={FileText}
                title="No profile yet"
                iconSize={32}
              />
            </Box>
          ) : (
            <List spacing={0}>
              {/* Generated Profiles Section */}
              {generatedFiles.length > 0 &&
                renderFileSection(generatedFiles, "Generated Profiles")}

              {/* Divider between sections */}
              {generatedFiles.length > 0 && compiledFiles.length > 0 && (
                <Box px={3} py={2}>
                  <Divider />
                </Box>
              )}

              {/* Compiled Profiles Section */}
              {compiledFiles.length > 0 &&
                renderFileSection(compiledFiles, "Compiled Profiles")}
            </List>
          )}
        </Box>
      </VStack>
    </Box>
  );
}
