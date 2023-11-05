import { Button, CircularProgress } from "@mui/material";
import { useState } from "react";

function FileUploader() {
  const [buttonLoading, setButtonLoading] = useState(false);

  return (
    <>
      <Button
        variant="contained"
        component="label"
      >
        Upload File
        <input
          type="file"
          hidden
          onChange={(event: any) => {
            console.log(event.target.files[0]);
            const file = event.target.files[0];
            const formData = new FormData();
            formData.append('file', file);
            setButtonLoading(true);
            fetch('http://localhost:8081/knowledge/add-file', {
              method: 'POST',
              body: formData
            })
              .then(response => response.text())
              .then(alert)
              .finally(() => setButtonLoading(false));
          }}
        />
      </Button>
      {buttonLoading && <CircularProgress />}
    </>
  )
}

export default FileUploader;