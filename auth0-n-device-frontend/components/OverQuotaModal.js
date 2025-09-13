// components/OverQuotaModal.js
import { useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  VStack,
  HStack,
  Text,
  Badge,
  Box,
  Select,
  Button,
  useToast,
} from "@chakra-ui/react";
import axios from "axios";
import { useAuth0 } from "@auth0/auth0-react";

const API = "https://lawandverdict.onrender.com";

function OverQuotaModal({ isOpen, onClose, data, onActivated }) {
  const { user } = useAuth0();
  const toast = useToast();

  const [selectedTarget, setSelectedTarget] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCancelCandidate = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/sessions/cancel`, {
        candidate: data.candidate,
      });
      toast({
        title: "Login canceled",
        description: "Your login attempt has been canceled.",
        status: "info",
        duration: 4000,
        isClosable: true,
      });
      onClose();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to cancel login.",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForceActivate = async () => {
    if (!selectedTarget) {
      toast({
        title: "Select a session",
        description: "Please choose a session to revoke.",
        status: "warning",
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    try {
      const resp = await axios.post(`${API}/sessions/force-activate`, {
        candidate: data.candidate,
        target: selectedTarget,
      });

      toast({
        title: "Session revoked",
        description: "Selected session has been revoked. You are now logged in.",
        status: "success",
        duration: 4000,
        isClosable: true,
      });

      onActivated(resp.data);
      onClose();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to revoke session.",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="lg">
      <ModalOverlay />
      <ModalContent maxW="lg" rounded="xl" shadow="xl">
        <ModalHeader fontWeight="bold" fontSize="xl" color="gray.800">
          Device Limit Reached
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack align="stretch" spacing={6}>
            <Text color="gray.700">
              Your account has reached the maximum number of active devices.
              To proceed, please revoke one of the existing sessions below.
            </Text>

            <Box>
              <Text fontWeight="semibold" mb={3}>
                Active Sessions
              </Text>
              {data.sessions.map((s) => (
                <HStack
                  key={s.id}
                  justify="space-between"
                  align="center"
                  p={3}
                  bg="gray.50"
                  rounded="md"
                  shadow="xs"
                >
                  <Box>
                    <Text fontSize="sm" fontWeight="medium">
                      {s.device_name}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {new Date(s.issued_at * 1000).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                        timeZoneName: "short",
                      })}
                    </Text>
                  </Box>
                  <Badge
                    colorScheme={
                      s.status === "active"
                        ? "green"
                        : s.status === "pending"
                        ? "orange"
                        : "red"
                    }
                  >
                    {s.status.toUpperCase()}
                  </Badge>
                </HStack>
              ))}
            </Box>

            <Box>
              <Text fontWeight="semibold" mb={2}>
                Select a session to revoke
              </Text>
              <Select
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value)}
                placeholder="Choose a session..."
              >
                {data.sessions
                  .filter((s) => s.status === "active")
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.device_name}
                    </option>
                  ))}
              </Select>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button
            variant="outline"
            mr={3}
            onClick={handleCancelCandidate}
            isLoading={loading}
          >
            Cancel Login
          </Button>
          <Button
            colorScheme="red"
            onClick={handleForceActivate}
            isLoading={loading}
          >
            Force Logout & Continue
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default OverQuotaModal;
