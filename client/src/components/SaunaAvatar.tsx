import { Box } from '@chakra-ui/react';

interface SaunaAvatarProps {
  size?: string;
  showPulse?: boolean;
  isProfileMode?: boolean;
}

export default function SaunaAvatar({ size = "48px", showPulse = false, isProfileMode = false }: SaunaAvatarProps) {
  return (
    <Box
      w={size}
      h={size}
      borderRadius="full"
      background="linear-gradient(135deg, #5BA163, #FFC116, #FF8142, #EE5983, #906FE4)"
      backgroundSize="200% 200%"
      animation={showPulse ? "pulse 2s ease-in-out infinite, gradient 3s ease infinite" : "gradient 3s ease infinite"}
      _before={{
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 'full',
        background: isProfileMode 
          ? 'radial-gradient(circle, transparent 60%, rgba(248, 250, 252, 0.9) 85%, rgba(248, 250, 252, 1) 100%)'
          : 'radial-gradient(circle, transparent 60%, rgba(248, 250, 252, 0.8) 85%, rgba(248, 250, 252, 1) 100%)',
        pointerEvents: 'none'
      }}
      sx={{
        '@keyframes pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' }
        },
        '@keyframes gradient': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' }
        }
      }}
    />
  );
} 