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
import { FileText, Trash2, Eye } from "lucide-react";
import { useState } from "react";
import { FileItem } from "../types";

interface FileListProps {
  files: Record<string, FileItem>;
  selectedFile: FileItem | null;
  onFileSelect: (fileName: string) => void;
  onDeleteFile: (fileName: string) => void;
  onDeleteAll: () => void;
  onCompileProfile: () => void;
  onPreviewFile?: (fileName: string, content: string) => void;
  isCompiling: boolean;
}

export default function FileList({
  files,
  selectedFile,
  onFileSelect,
  onDeleteFile,
  onDeleteAll,
  onCompileProfile,
  onPreviewFile,
  isCompiling,
}: FileListProps) {
  const [contextMenuFile, setContextMenuFile] = useState<string | null>(null);

  // Define compiled vs generated file categories
  const compiledCategories = ["full", "automation"]; // Files that are compiled from other files
  const generatedCategories = [
    "basic",
    "personal",
    "professional",
    "goals",
    "behavioral",
    "relationships",
    "communication",
    "accounts",
  ];

  // Group files by category (extracted from filename)
  const getCategory = (fileName: string) => {
    const baseName = fileName.replace(".md", "");
    // Map bio files to general category for emoji display, but keep original for sorting
    return baseName;
  };

  // Emoji map for profile categories
  const categoryEmojis: Record<string, string> = {
    behavioral: "🎯",
    goals: "🚀",
    relationships: "👥",
    professional: "💼",
    personal: "❤️",
    accounts: "🔐",
    style: "✨",
    communication: "💬",
    general: "📄",
    bio: "📄",
    basic: "📄",
    full: "🌟",
    automation: "🤖",
  };

  // Group and sort files by type
  const fileEntries = Object.entries(files);

  const compiledFiles = fileEntries
    .filter(([fileName]) => {
      const category = getCategory(fileName);
      return compiledCategories.includes(category);
    })
    .sort(([fileNameA], [fileNameB]) => {
      const categoryA = getCategory(fileNameA);
      const categoryB = getCategory(fileNameB);
      return (
        compiledCategories.indexOf(categoryA) -
        compiledCategories.indexOf(categoryB)
      );
    });

  const generatedFiles = fileEntries
    .filter(([fileName]) => {
      const category = getCategory(fileName);
      return generatedCategories.includes(category);
    })
    .sort(([fileNameA], [fileNameB]) => {
      const categoryA = getCategory(fileNameA);
      const categoryB = getCategory(fileNameB);
      return (
        generatedCategories.indexOf(categoryA) -
        generatedCategories.indexOf(categoryB)
      );
    });

  const getCategoryWithEmoji = (category: string) => {
    // Map bio to general for display purposes
    const displayCategory = category === "bio" ? "general" : category;
    const emoji = categoryEmojis[displayCategory] || "📄";
    return `${emoji} ${displayCategory}`;
  };

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

  const handlePreviewFile = (fileName: string) => {
    const file = files[fileName];
    if (file && onPreviewFile) {
      onPreviewFile(fileName, file.content);
    }
    setContextMenuFile(null);
  };

  const canPreview = (fileName: string) => {
    const category = getCategory(fileName);
    return compiledCategories.includes(category) && onPreviewFile;
  };

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
          {fileEntries.length === 0 && (
            <Box p={4} textAlign="center" py={8} mt={"50%"}>
              <FileText
                size={32}
                color="#9CA3AF"
                style={{ margin: "0 auto" }}
              />
              <Text mt={3} fontSize="sm" color="gray.500">
                No profile yet
              </Text>
            </Box>
          )}

          {fileEntries.length > 0 && (
            <List spacing={0}>
              {/* Generated Profiles Section */}
              {generatedFiles.length > 0 && (
                <>
                  <Box px={3} py={2} bg="gray.100">
                    <Text
                      fontSize="xs"
                      fontWeight="semibold"
                      color="gray.600"
                      textTransform="uppercase"
                      letterSpacing="wider"
                    >
                      Generated Profiles
                    </Text>
                  </Box>
                  {generatedFiles.map(([fileName, file]) => {
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
                            Updated{" "}
                            {new Date(file.updatedAt).toLocaleDateString()}
                          </Text>
                        </MenuButton>
                        <MenuList>
                          {canPreview(fileName) && (
                            <MenuItem
                              icon={<Eye size={16} />}
                              onClick={() => handlePreviewFile(fileName)}
                              color="blue.600"
                            >
                              Preview {getCategoryWithEmoji(category)}
                            </MenuItem>
                          )}
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
              )}

              {/* Divider between sections */}
              {generatedFiles.length > 0 && compiledFiles.length > 0 && (
                <Box px={3} py={2}>
                  <Divider />
                </Box>
              )}

              {/* Compiled Profiles Section */}
              {compiledFiles.length > 0 && (
                <>
                  <Box px={3} py={2} bg="gray.100">
                    <Text
                      fontSize="xs"
                      fontWeight="semibold"
                      color="gray.600"
                      textTransform="uppercase"
                      letterSpacing="wider"
                    >
                      Compiled Profiles
                    </Text>
                  </Box>
                  {compiledFiles.map(([fileName, file]) => {
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
                            Updated{" "}
                            {new Date(file.updatedAt).toLocaleDateString()}
                          </Text>
                        </MenuButton>
                        <MenuList>
                          {canPreview(fileName) && (
                            <MenuItem
                              icon={<Eye size={16} />}
                              onClick={() => handlePreviewFile(fileName)}
                              color="blue.600"
                            >
                              Preview {getCategoryWithEmoji(category)}
                            </MenuItem>
                          )}
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
              )}
            </List>
          )}
        </Box>
      </VStack>
    </Box>
  );
}
