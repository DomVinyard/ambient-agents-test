import { Box } from "@chakra-ui/react";

interface DashboardPanelProps {
  width: string;
  children: React.ReactNode;
  isEmpty?: boolean;
}

export default function DashboardPanel({
  width,
  children,
  isEmpty = false,
}: DashboardPanelProps) {
  if (isEmpty) {
    return (
      <Box
        w={width}
        h="100%"
        bg="gray.100"
        borderRight="1px solid"
        borderColor="gray.200"
      />
    );
  }

  return (
    <Box w={width} h="100%">
      {children}
    </Box>
  );
}
