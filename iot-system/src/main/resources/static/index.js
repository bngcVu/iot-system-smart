document.getElementById('temp-window').addEventListener('change', (e) => {
  loadInitialSensorData(parseInt(e.target.value));
});
document.getElementById('hum-window').addEventListener('change', (e) => {
  loadInitialSensorData(parseInt(e.target.value));
});
document.getElementById('light-window').addEventListener('change', (e) => {
  loadInitialSensorData(parseInt(e.target.value));
});
