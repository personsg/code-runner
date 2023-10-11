import React from 'react';
import { TextField, Button, Box } from '@mui/material';

interface Props {
  goal: string;
  setGoal: (goal: string) => void;
  goalSent: boolean;
  sendGoal: (message: string) => void;
}

export const Goal: React.FC<Props> = ({ goal, setGoal, goalSent, sendGoal }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        top: goalSent ? '40px' : '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        transition: 'top 0.7s ease-out',
      }}
    >
      <TextField
        sx={{
          width: goalSent ? '600px' : '400px',
          // height: '33px',
          // border: '1px solid black',
          transition: 'width 0.7s ease-out',
        }}
        type='text'
        value={goal}
        onChange={e => setGoal(e.target.value)}
        disabled={!!goalSent}
        multiline
      />
      <Button
        sx={{
          marginLeft: '10px',
          // height: 'calc(33px + 2px)',
          // border: '1px solid black',
          visibility: goalSent ? 'hidden' : 'visible',
        }}
        variant='contained'
        onClick={() => sendGoal(goal)}
        disabled={!!goalSent}
      >
        Enter
      </Button>
    </Box>
  );
};
