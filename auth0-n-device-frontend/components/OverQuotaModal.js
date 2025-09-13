<ModalContent maxW="lg" rounded="2xl" shadow="2xl">
  <ModalHeader fontWeight="bold" fontSize="xl" color="teal.700">
    Device Limit Reached
  </ModalHeader>
  <ModalCloseButton />

  <ModalBody>
    <VStack align="stretch" spacing={6}>
      {/* Intro Text */}
      <Text color="gray.700">
        Your account has reached the maximum number of active devices.{" "}
        To proceed, please revoke one of the existing sessions below.
      </Text>

      {/* Active Sessions List */}
      <Box>
        <Text fontWeight="semibold" mb={3} color="gray.800">
          Active Sessions
        </Text>
        <VStack align="stretch" spacing={3}>
          {sessions.map((s) => (
            <HStack
              key={s.id}
              justify="space-between"
              align="center"
              p={3}
              bg="gray.50"
              rounded="lg"
              shadow="xs"
            >
              <Box>
                <Text fontSize="sm" fontWeight="medium" color="gray.800">
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
                  })}
                </Text>
              </Box>
              <Badge
                px={2}
                py={1}
                rounded="full"
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
        </VStack>
      </Box>

      {/* Revoke Dropdown */}
      <Box>
        <Text fontWeight="semibold" mb={2} color="gray.800">
          Select a session to revoke
        </Text>
        <Select
          value={selectedTarget}
          onChange={(e) => setSelectedTarget(e.target.value)}
          placeholder="Choose a session..."
          rounded="md"
          focusBorderColor="teal.400"
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
      rounded="md"
    >
      Cancel Login
    </Button>
    <Button
      colorScheme="red"
      onClick={handleForceActivate}
      isLoading={loading}
      rounded="md"
    >
      Force Logout & Continue
    </Button>
  </ModalFooter>
</ModalContent>
