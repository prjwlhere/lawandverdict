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
        <Text fontWeight="semibold" mb={3}>Active Sessions</Text>
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
              <Text fontSize="sm" fontWeight="medium">{s.device_name}</Text>
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
                s.status === "active" ? "green" :
                s.status === "pending" ? "orange" : "red"
              }
            >
              {s.status.toUpperCase()}
            </Badge>
          </HStack>
        ))}
      </Box>

      <Box>
        <Text fontWeight="semibold" mb={2}>Select a session to revoke</Text>
        <Select
          value={selectedTarget}
          onChange={(e) => setSelectedTarget(e.target.value)}
          placeholder="Choose a session..."
        >
          {sessions.filter((s) => s.status === "active").map((s) => (
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
