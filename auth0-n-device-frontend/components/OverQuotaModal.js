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
  Button,
  VStack,
  HStack,
  Text,
  Badge,
  Box,
  Select,
  useToast,
} from "@chakra-ui/react";
import axios from "axios";
import { useAuth0 } from "@auth0/auth0-react";

const API = "https://lawandverdict.onrender.com";

export default function OverQuotaModal({ isOpen, onClose, data, onActivated }) {
  const { candidate, sessions } = data;
  const [selectedTarget, setSelectedTarget] = useState(
    sessions.find((s) => s.status === "active")?.id || ""
  );
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const { getAccessTokenSilently } = useAuth0();

  async function handleCancelCandidate() {
    setLoading(true);
    try {
      if (!candidate) {
        toast({ title: "No candidate session ID found", status: "error" });
        return;
      }

      const token = await getAccessTokenSilently({
        authorizationParams: { audience: "https://fastapi-backend" },
      });

      await axios.post(
        `${API}/sessions/cancel`,
        { session_id: candidate },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      toast({ title: "Login cancelled", status: "info" });
      window.location.href = "/";
    } catch (e) {
      const detail =
        e?.response?.data?.detail || e?.message || "Unable to cancel";
      toast({ title: detail, status: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleForceActivate() {
    if (!selectedTarget) {
      toast({ title: "Select a device to revoke", status: "warning" });
      return;
    }
    setLoading(true);
    try {
      const token = await getAccessTokenSilently({
        authorizationParams: { audience: "https://fastapi-backend" },
      });

      await axios.post(
        `${API}/sessions/force_activate`,
        { candidate_id: candidate, target_id: selectedTarget }, // 👈 unchanged payload
        { headers: { Authorization: `Bearer ${token}` } }
      );

      localStorage.setItem("session_id", candidate);
      toast({ title: "Activated on this device", status: "success" });
      onActivated();
    } catch (e) {
      const detail =
        e?.response?.data?.detail || e?.message || "Unable to force activate";
      toast({ title: detail, status: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
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
              {sessions.map((s) => (
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
                {sessions
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
