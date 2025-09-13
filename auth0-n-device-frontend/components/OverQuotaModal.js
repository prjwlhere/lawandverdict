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

export default function OverQuotaModal({ data, onActivated }) {
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
    console.log("handleCancelCandidate - candidate:", candidate);
    if (!candidate) {
      toast({ title: "No candidate session ID found", status: "error" });
      setLoading(false);
      return;
    }

    const token = await getAccessTokenSilently({
      authorizationParams: { audience: "https://fastapi-backend" },
    });

    const resp = await axios.post(
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

    console.log("cancel resp", resp.data);
    toast({ title: "Login cancelled", status: "info" });
    // redirect to home
    window.location.href = "/";
  } catch (e) {
    console.error("cancel error", e);
    const detail = e?.response?.data?.detail || e?.message || "Unable to cancel";
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
        { candidate_id: candidate, target_id: selectedTarget },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      localStorage.setItem("session_id", candidate);
      toast({ title: "Activated on this device", status: "success" });
      onActivated();
    } catch (e) {
      toast({ title: "Unable to force activate", status: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={true} onClose={() => {}} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Device limit reached</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack align="stretch" spacing={4}>
            <Text>
              You are attempting to sign in on a new device, but only N devices
              are allowed.
            </Text>
            <Box>
              <Text fontWeight="bold" mb={2}>
                Existing sessions
              </Text>
              {sessions.map((s) => (
                <HStack
                  key={s.id}
                  justify="space-between"
                  mb={2}
                  p={2}
                  bg="gray.50"
                  rounded="md"
                >
                  <Box>
                    <Text fontSize="sm">{s.device_name}</Text>
                    <Text fontSize="xs" color="gray.600">
                      issued:{" "}
                      {new Date(s.issued_at * 1000).toLocaleString()}
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
                    {s.status}
                  </Badge>
                </HStack>
              ))}
            </Box>
            <Box>
              <Text fontWeight="bold" mb={2}>
                Select a session to revoke
              </Text>
              <Select
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value)}
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
          <Button variant="ghost" mr={3} onClick={handleCancelCandidate}>
            Cancel Login
          </Button>
          <Button colorScheme="red" onClick={handleForceActivate}>
            Force Logout Selected Device
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
