import { useToast } from "@chakra-ui/react";

export function useAppToast() {
  const toast = useToast();

  const showError = (title: string, description?: string) => {
    toast({
      title,
      description: description || "Please try again.",
      status: "error",
      duration: 3000,
      isClosable: true,
    });
  };

  const showSuccess = (title: string, description?: string) => {
    toast({
      title,
      description,
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  const showWarning = (title: string, description?: string) => {
    toast({
      title,
      description,
      status: "warning",
      duration: 3000,
      isClosable: true,
    });
  };

  const showInfo = (title: string, description?: string) => {
    toast({
      title,
      description,
      status: "info",
      duration: 2000,
      isClosable: true,
    });
  };

  return {
    showError,
    showSuccess,
    showWarning,
    showInfo,
  };
} 