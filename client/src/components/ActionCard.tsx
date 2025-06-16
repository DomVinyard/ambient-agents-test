import { Box, Heading, Text, Stack, Button, RadioGroup, Radio, CheckboxGroup, Checkbox, Textarea, HStack } from '@chakra-ui/react';
import { useState } from 'react';

export type ActionItem = {
  id?: string;
  type: 'simple_confirm' | 'decision' | 'supply_info' | 'edit_info';
  text: string;
  options?: string[]; // for decision
  text_to_edit?: string; // for edit_info type
  agent_id?: string; // which agent triggered this 
  action?: { type: string; [key: string]: any };
  request?: string; // alternative to text
};

type ActionCardProps = {
  action: ActionItem;
  onRespond: (response: any) => void;
};

export default function ActionCard({ action, onRespond }: ActionCardProps) {
  const [suppliedInfo, setSuppliedInfo] = useState('');
  const [decision, setDecision] = useState('');
  const [checklist, setChecklist] = useState<string[]>([]);
  const [editedText, setEditedText] = useState(action.text_to_edit || '');

  const displayText = action.text || action.request || '';

  return (
    <Box boxShadow="xl" p={6} borderRadius="lg" bg="white">
      <Stack direction="column" gap={4}>
        <Heading size="md" color="gray.800">
          {action.type.charAt(0).toUpperCase() + action.type.slice(1).replace('_', ' ')}
          {action.agent_id && <Text as="span" fontSize="sm" color="gray.500" ml={2}>({action.agent_id})</Text>}
        </Heading>
        <Text color="gray.700">{displayText}</Text>
        {/* Render controls based on type */}
        {action.type === 'simple_confirm' && (
          <HStack>
            <Button colorScheme="blue" onClick={() => onRespond('yes')}>Yes</Button>
            <Button colorScheme="gray" onClick={() => onRespond('no')}>No</Button>
          </HStack>
        )}
        {action.type === 'decision' && action.options && (
          <RadioGroup onChange={setDecision} value={decision}>
            <Stack direction="column">
              {action.options.map(opt => (
                <Radio key={opt} value={opt}>{opt}</Radio>
              ))}
            </Stack>
            <Button mt={2} colorScheme="blue" onClick={() => onRespond(decision)} isDisabled={!decision}>Submit</Button>
          </RadioGroup>
        )}
        {action.type === 'supply_info' && (
          <Stack>
            <Textarea 
              value={suppliedInfo} 
              onChange={e => setSuppliedInfo(e.target.value)} 
              placeholder="Type your response..."
            />
            <Button colorScheme="blue" onClick={() => onRespond(suppliedInfo)} isDisabled={!suppliedInfo}>Submit</Button>
          </Stack>
        )}
        {action.type === 'edit_info' && (
          <Stack>
            <Text fontSize="sm" color="gray.600">Edit the text below:</Text>
            <Textarea 
              value={editedText} 
              onChange={e => setEditedText(e.target.value)} 
              placeholder="Edit the text..."
              minHeight="150px"
            />
            <Button colorScheme="blue" onClick={() => onRespond(editedText)} isDisabled={!editedText}>Save Changes</Button>
          </Stack>
        )}
      </Stack>
    </Box>
  );
} 