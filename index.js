// let accel = new Accelerometer({ referenceFrame: "device" });
import fft from "./fft.js";

window.onload = () => {
  const SAMPLE_RATE = 60;
  let accelerometer = new Accelerometer({ frequency: SAMPLE_RATE });
  let isRecording = false;

  let reading = document.getElementById("reading");
  let recordBut = document.getElementById("record");
  let downloadBut = document.getElementById("download");

  let readings = [];

  let ctx = document.getElementById("myChart").getContext("2d");
  let myChart = new Chart(ctx, {
    type: "line",
    data: {
      // labels: ["Red", "Blue", "Yellow", "Green", "Purple", "Orange"],
      datasets: [
        {
          label: "Amplitude",
          // data: [12, 19, 3, 5, 2, 3],
          // backgroundColor: [
          //   "rgba(255, 99, 132, 0.2)",
          //   "rgba(54, 162, 235, 0.2)",
          //   "rgba(255, 206, 86, 0.2)",
          //   "rgba(75, 192, 192, 0.2)",
          //   "rgba(153, 102, 255, 0.2)",
          //   "rgba(255, 159, 64, 0.2)",
          // ],
          // borderColor: [
          //   "rgba(255, 99, 132, 1)",
          //   "rgba(54, 162, 235, 1)",
          //   "rgba(255, 206, 86, 1)",
          //   "rgba(75, 192, 192, 1)",
          //   "rgba(153, 102, 255, 1)",
          //   "rgba(255, 159, 64, 1)",
          // ],
          // borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      tooltips: {
        mode: "index",
        callbacks: {
          title: (tooltip) => data.labels[tooltip[0].index],
        },
      },
      hover: {
        mode: "nearest",
        intersect: true,
      },
    },
  });

  const toEulerAngles = (quat) => {
    const q0 = quat[0];
    const q1 = quat[1];
    const q2 = quat[2];
    const q3 = quat[3];

    return {
      x: Math.atan2(2 * (q0 * q1 + q2 * q3), 1 - 2 * (q1 * q1 + q2 * q2)),
      y: Math.asin(2 * (q0 * q2 - q3 * q1)),
      z: Math.atan2(2 * (q0 * q3 + q1 * q2), 1 - 2 * (q2 * q2 + q3 * q3)),
    };
  };

  accelerometer.addEventListener("reading", (e) => {
    readings.push({
      x: accelerometer.x,
      y: accelerometer.y,
      z: accelerometer.z,
    });
    reading.textContent = `Reading: (${accelerometer.x}, ${accelerometer.y}, ${accelerometer.z})`;
  });

  downloadBut.onclick = () => {
    // {
    //   // Save frequencies
    //   let a = document.createElement("a");
    //   let url = URL.createObjectURL(
    //     new Blob([JSON.stringify(values)], {
    //       type: "application/json",
    //     })
    //   );
    //   a.href = url;
    //   a.download = "frequencies.json";
    //   document.body.appendChild(a);
    //   a.click();
    //   setTimeout(function () {
    //     document.body.removeChild(a);
    //     window.URL.revokeObjectURL(url);
    //   }, 0);
    // }
    {
      // Save readings
      let a = document.createElement("a");
      let url = URL.createObjectURL(
        new Blob([JSON.stringify(readings)], {
          type: "application/json",
        })
      );
      a.href = url;
      a.download = "readings.json";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 0);
    }
  };

  recordBut.onclick = () => {
    if (isRecording) {
      recordBut.textContent = "Start Recording";
      isRecording = false;
      accelerometer.stop();

      // readings = [];
      // for (let i = 0; i < 20 * SAMPLE_RATE; i++) {
      //   readings.push({ y: Math.sin((Math.PI * 2 * i) / SAMPLE_RATE) });
      // }

      let size = 1;
      while (size < readings.length) size *= 2;

      const f = new fft(size);

      const input = new Array(size);
      input.fill(0);
      const out = f.createComplexArray();

      for (let i = 0; i < readings.length; i++) {
        input[i] = readings[i].y;
      }

      console.log("Started Frequency Analysis");

      f.realTransform(out, input);

      console.log("Started Frequency Completed");

      let values = f.fromComplexArray(out);
      values = values.slice(0, values.length / 2);

      myChart.data.labels = new Array(values.length)
        .fill("")
        .map(
          (value, index) => (index * SAMPLE_RATE) / (2 * values.length) + "hz"
        )
        .slice(1);
      myChart.data.datasets[0].data = values.slice(1);
      myChart.update();
    } else {
      recordBut.textContent = "Stop Recording";
      isRecording = true;
      readings = [];

      Promise.all([
        navigator.permissions.query({ name: "accelerometer" }),
        navigator.permissions.query({ name: "magnetometer" }),
        navigator.permissions.query({ name: "gyroscope" }),
      ]).then((results) => {
        if (results.every((result) => result.state === "granted")) {
          accelerometer.start();
        } else {
          console.log("No permissions to use AbsoluteOrientationSensor.");
        }
      });
    }
  };
};
