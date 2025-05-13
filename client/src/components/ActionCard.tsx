import { Box, Heading, Text, Stack, Button, RadioGroup, Radio, CheckboxGroup, Checkbox, Textarea, HStack } from '@chakra-ui/react';
import { useState } from 'react';

export type ActionItem = {
  id?: string;
  type: 'question' | 'decision' | 'clarification' | 'execution' | 'suggested-agent' | 'suggested-connection';
  text: string;
  options?: string[]; // for decision/checklist
  action?: { type: string; [key: string]: any };
};

type ActionCardProps = {
  action: ActionItem;
  onRespond: (response: any) => void;
};

export default function ActionCard({ action, onRespond }: ActionCardProps) {
  const [clarification, setClarification] = useState('');
  const [decision, setDecision] = useState('');
  const [checklist, setChecklist] = useState<string[]>([]);

  return (
    <Box boxShadow="xl" p={6} borderRadius="lg" bg="white">
      <Stack direction="column" gap={4}>
        <Heading size="md" color="gray.800">
          {action.type.charAt(0).toUpperCase() + action.type.slice(1).replace('-', ' ')}
        </Heading>
        <Text color="gray.700">{action.text}</Text>
        {/* Render controls based on type */}
        {action.type === 'question' && !action.options && (
          <HStack>
            <Button colorScheme="blue" onClick={() => onRespond('yes')}>Yes</Button>
            <Button colorScheme="gray" onClick={() => onRespond('no')}>No</Button>
          </HStack>
        )}
        {action.type === 'question' && action.options && (
          <RadioGroup onChange={setDecision} value={decision}>
            <Stack direction="column">
              {action.options.map(opt => (
                <Radio key={opt} value={opt}>{opt}</Radio>
              ))}
            </Stack>
            <Button mt={2} colorScheme="blue" onClick={() => onRespond(decision)} isDisabled={!decision}>Submit</Button>
          </RadioGroup>
        )}
        {action.type === 'decision' && action.options && (
          <CheckboxGroup value={checklist} onChange={val => setChecklist(val as string[])}>
            <Stack direction="column">
              {action.options.map(opt => (
                <Checkbox key={opt} value={opt}>{opt}</Checkbox>
              ))}
            </Stack>
            <Button mt={2} colorScheme="blue" onClick={() => onRespond(checklist)} isDisabled={checklist.length === 0}>Submit</Button>
          </CheckboxGroup>
        )}
        {action.type === 'clarification' && (
          <Stack>
            <Textarea value={clarification} onChange={e => setClarification(e.target.value)} placeholder="Type your clarification..." />
            <Button colorScheme="blue" onClick={() => onRespond(clarification)} isDisabled={!clarification}>Submit</Button>
          </Stack>
        )}
        {(action.type === 'execution' || action.type === 'suggested-agent') && (
          <HStack>
            <Button colorScheme="blue" onClick={() => onRespond('approve')}>Approve</Button>
            <Button colorScheme="gray" onClick={() => onRespond('edit')}>Edit</Button>
            <Button colorScheme="red" onClick={() => onRespond('reject')}>Reject</Button>
          </HStack>
        )}
        {action.type === 'suggested-connection' && (
          <HStack>
            <Button colorScheme="blue" onClick={() => onRespond('approve')}>Approve</Button>
            <Button colorScheme="red" onClick={() => onRespond('reject')}>Reject</Button>
          </HStack>
        )}
      </Stack>
    </Box>
  );
} 