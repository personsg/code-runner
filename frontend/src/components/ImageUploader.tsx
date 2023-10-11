import ImageSearchIcon from '@mui/icons-material/ImageSearch';

export function ImageUploader() {
  const handleUpload = (files: FileList | null) => {
    const url = 'http://localhost:8081/upload-image'

    if (!files || files.length === 0) {
      return
    }

    const formData = new FormData();
    formData.append('image', files[0]);

    fetch(url, {
      method: 'POST',
      body: formData
    })
      .then(response => response.text())
      .then(result => console.log(result))
      .catch(error => console.log('Error:', error));
  }


  return (
    <>
      <input
        accept="image/*"
        style={{ display: 'none' }}
        id="raised-button-file"
        multiple
        type="file"
        onChange={(e) => {
          handleUpload(e.target.files)
        }}
      />
      <label htmlFor="raised-button-file">
        <ImageSearchIcon
          sx={{
            fontSize: '40px',
            color: 'action.active', mr: 1, my: 1
          }} />
      </label>
    </>
  )
}