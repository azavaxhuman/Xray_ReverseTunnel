function copyUUID() {
  const uuidField = document.getElementById("UUID");
  uuidField.select();
  document.execCommand("copy");

  const button = document.querySelector(".uuid-container .copy-button-uuid");
  const originalText = button.textContent;
  button.textContent = "Copied!";
  setTimeout(() => {
    button.textContent = originalText;
  }, 2000);
}
function copyToClipboard(elementId) {
  const textarea = document.getElementById(elementId);
  textarea.select();
  document.execCommand("copy");
}
// Tab switching functionality
document.querySelectorAll(".tab-button").forEach((button) => {
  button.addEventListener("click", () => {
    // Remove active class from all buttons and content
    document.querySelectorAll(".tab-button").forEach((btn) => btn.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((content) => content.classList.remove("active"));
    // Add active class to clicked button
    button.classList.add("active");
    // Show corresponding content
    const tabId = `${button.dataset.tab}-tab`;
    document.getElementById(tabId).classList.add("active");
  });
});

// let keys = [];

// async function fetchKeys() {
//   try {
//     const response = await fetch("../keys.json");
//     if (!response.ok) {
//       throw new Error("Failed to load keys.json");
//     }
//     const data = await response.json();
//     keys = data.keys;
//   } catch (error) {
//     console.error("Error loading keys:", error);
//     alert(
//       "Failed to load keys. Please check the console for more details."
//     );
//   }
// }
function generateRandomString() {
  const length = Math.floor(Math.random() * 5) + 8; // Random length between 8 and 12
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}
function generateRandomPort() {
  const excludedPorts = [80, 443, 2096, 8443, 2083, 22];
  let port;
  do {
    port = Math.floor(Math.random() * (65534 - 1001 + 1)) + 1001;
  } while (excludedPorts.includes(port));
  return port;
}
function generateConfig() {
  // if (keys.length === 0) return;
  // const randomIndex = Math.floor(Math.random() * keys.length);
  // const privateKey = keys[randomIndex].privateKey;
  // const publicKey = keys[randomIndex].publicKey;
  // const shortIds = Array.from(crypto.getRandomValues(new Uint8Array(8)))
  //   .map((b) => b.toString(16).padStart(2, "0"))
  //   .join("");
  const uuid = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g,
    (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16));

  document.getElementById("UUID").value = uuid; // Set the generated UUID

  const sni = document.getElementById("sni").value.trim() || "example.com";
  const port = document.getElementById("port").value || "3030";
  const incomePort = document.getElementById("iranIncome").value || "4040";
  const RandomTag = generateRandomString();
  const RandomString = generateRandomString();
  const ip = document.getElementById("domain").value.trim() || "127.0.0.1";
  const MainInbound_port = document.getElementById("MainOutbound_port").value || "1080";
  const path = document.getElementById("path").value.trim() || "/path";
  const certFile = document.getElementById("pubKey").value.trim() || "/var/lib/certs/fullchain.crt";
  const keyFile = document.getElementById("private_Key").value.trim() || "/var/lib/certs/key.key";
  if (!path.startsWith("/")) {
    path = "/" + path;
  }
  if (path === "/" || path === "") {
    Json_path = "";
  } else {
    Json_path = `"path": "${path}"`;
  }

  const protocolToggle = document.getElementById('protocol-toggle');
  let security;
  let out_security;

  // Determine security settings based on protocolToggle content
  if (protocolToggle.textContent.trim() === 'None') {
    security = `"security": "none"`;
  } else {
    security = `
      "security": "tls",
      "tlsSettings": {
        "serverName": "${sni}",
        "certificates": [
          {
            "ocspStapling": 3600,
            "certificateFile": "${certFile}",
            "keyFile": "${keyFile}"
          }
        ],
        "minVersion": "1.2"
      }`;
  }
  if (protocolToggle.textContent.trim() === 'None') {
    out_security = `"security": "none"`;
  } else {
    out_security = `
      "security": "tls",
      "tlsSettings": {
        "serverName": "${sni}",
        "alpn": [
          "h3",
          "h2"
        ],
        "fingerprint": "chrome",
        "allowInsecure": false
      }`;
  }
  // Build the inbound configuration
  const inboundConfig = `
  {
    "tag": "inbound-${incomePort}",
    "listen": "0.0.0.0",
    "port": ${incomePort},
    "protocol": "dokodemo-door",
    "settings": {
      "address": "127.0.0.1",
      "port": ${MainInbound_port},
      "network": ["tcp", "udp"],
      "followRedirect": false
    },
    "sniffing": {
      "enabled": false,
      "destOverride": ["http", "tls", "quic", "fakedns"],
      "metadataOnly": false,
      "routeOnly": false
    }
  },
  {
    "tag": "VLESS_WS_${port}",
    "listen": "0.0.0.0",
    "port": ${port},
    "protocol": "vless",
    "settings": {
      "clients": [],
      "decryption": "none"
    },
    "streamSettings": {
      "network": "ws",
      "wsSettings": {
        ${Json_path}
      },
      ${security}
    },
    "sniffing": {
      "enabled": true,
      "destOverride": ["http", "tls", "fakedns", "quic"]
    }
  }`;

  // Build the outbound configuration
  const outboundConfig = `
  {
    "tag": "OUT_VLESS_WS_${port}",
    "protocol": "vless",
    "settings": {
      "vnext": [
        {
          "address": "${ip}",
          "port": ${port},
          "users": [
            {
              "id": "${uuid}",
              "flow": "",
              "encryption": "none"
            }
          ]
        }
      ]
    },
    "streamSettings": {
      "network": "ws",
      ${out_security},
      "wsSettings": {
        ${Json_path}
      }
    }
  }`;

  // Build the reverse configuration
  const reverse = `

    "reverse": {
      "portals": [
        {
          "tag": "${RandomTag}",
          "domain": "${RandomString}.com"
        }
      ],
      "bridges": [
        {
          "tag": "(Bridge)${RandomTag}",
          "domain": "${RandomString}.com"
        }
      ]
    }
  `;
  // Build the routing configuration
  const routing = `
  {
    "domain": ["full:${RandomString}.com"],
    "outboundTag": "${RandomTag}",
    "inboundTag": ["VLESS_WS_${port}"],
    "type": "field"
  },
  {
    "outboundTag": "${RandomTag}",
    "inboundTag": ["inbound-${incomePort}"],
    "type": "field"
  },
  {
    "domain": ["full:${RandomString}.com"],
    "outboundTag": "OUT_VLESS_WS_${port}",
    "inboundTag": ["(Bridge)${RandomTag}"],
    "type": "field"
  },
  {
    "outboundTag": "DIRECT",
    "inboundTag": ["(Bridge)${RandomTag}"],
    "type": "field"
  }`;


  document.getElementById("inboundConfig").value = inboundConfig.trim();
  document.getElementById("outboundConfig").value = outboundConfig.trim();
  document.getElementById("reverse").value = reverse.trim();
  document.getElementById("routing").value = routing.trim();
}
// Add this script at the end of your existing script section
function closeNotification() {
  const notification = document.getElementById("telegram-notification");
  notification.style.right = "-300px"; // Hide the notification
}

window.onload = function() {
  setTimeout(function() {
    const notification = document.getElementById("telegram-notification");
    notification.style.right = "1rem"; // Show the notification
  }, 10000); // 10 seconds
};

function toggleProtocol() {
  const protocolToggle = document.getElementById('protocol-toggle');
  const tlsDependentFields = document.querySelectorAll('.tls-dependent');
  if (protocolToggle.textContent === 'None') {
    protocolToggle.textContent = 'TLS';
    protocolToggle.classList.remove('none');
    protocolToggle.classList.add('tls');
    tlsDependentFields.forEach(field => {
      field.classList.add('show');
    });
  } else {
    protocolToggle.textContent = 'None';
    protocolToggle.classList.remove('tls');
    protocolToggle.classList.add('none');
    tlsDependentFields.forEach(field => {
      field.classList.remove('show');
    });
  }
  generateConfig();
}

window.onload = async () => {
  generateConfig();
  toggleProtocol();
  const notification = document.getElementById("telegram-notification");
  notification.style.right = "1rem"; // Show the notification
  const video_notification = document.getElementById("video-notification");
  notification.classList.add("show"); // Show the notification
};
const inputIncomePort = document.querySelector('.tr-input-number-input[name="income-port"]');
const upIncomePort = document.querySelector('.tr-input-number-handler-up[id="income-port-up"]');
const downIncomePort = document.querySelector('.tr-input-number-handler-down[id="income-port-down"]');
const inputInterConnectionInboundPort = document.querySelector('.tr-input-number-input[name="interconnection-inbound-port"]');
const upInterConnectionInboundPort = document.querySelector('.tr-input-number-handler-up[id="interconnection-inbound-port-up"]');
const downInterConnectionInboundPort = document.querySelector('.tr-input-number-handler-down[id="interconnection-inbound-port-down"]');
const inputMainPort = document.querySelector('.tr-input-number-input[name="main-inbound-port"]');
const upMainPort = document.querySelector('.tr-input-number-handler-up[id="main-inbound-port-up"]');
const downMainPort = document.querySelector('.tr-input-number-handler-down[id="main-inbound-port-down"]');
let timerIncomePort = null;
let timerInterConnectionInboundPort = null;
let timerMainPort = null;
// Income Port
const increaseIncomePort = function() {
  let value = parseInt(inputIncomePort.value);
  const maxValue = parseInt(inputIncomePort.getAttribute('max'));
  const minValue = parseInt(inputIncomePort.getAttribute('min'));
  if (value < maxValue) {
    value++;
    inputIncomePort.value = value;
    if (value === maxValue) {
      upIncomePort.classList.add('tr-input-number-handler-up-disabled');
    }
    if (value > minValue) {
      downIncomePort.classList.remove('tr-input-number-handler-down-disabled');
    }
    timerIncomePort = setTimeout(increaseIncomePort, 100);
  }
};
const decreaseIncomePort = function() {
  let value = parseInt(inputIncomePort.value);
  const minValue = parseInt(inputIncomePort.getAttribute('min'));
  const maxValue = parseInt(inputIncomePort.getAttribute('max'));
  if (value > minValue) {
    value--;
    inputIncomePort.value = value;
    if (value === minValue) {
      downIncomePort.classList.add('tr-input-number-handler-down-disabled');
    }
    if (value < maxValue) {
      upIncomePort.classList.remove('tr-input-number-handler-up-disabled');
    }
    timerIncomePort = setTimeout(decreaseIncomePort, 100);
  }
};
upIncomePort.addEventListener('mousedown', function() {
  clearTimeout(timerIncomePort);
  increaseIncomePort();
});
upIncomePort.addEventListener('touchstart', function() {
  clearTimeout(timerIncomePort);
  increaseIncomePort();
}, {
  passive: true
});
upIncomePort.addEventListener('mouseup', function() {
  clearTimeout(timerIncomePort);
});
upIncomePort.addEventListener('touchend', function() {
  clearTimeout(timerIncomePort);
});
upIncomePort.addEventListener('mouseleave', function() {
  clearTimeout(timerIncomePort);
});
downIncomePort.addEventListener('mousedown', function() {
  clearTimeout(timerIncomePort);
  decreaseIncomePort();
});
downIncomePort.addEventListener('touchstart', function() {
  clearTimeout(timerIncomePort);
  decreaseIncomePort();
}, {
  passive: true
});
downIncomePort.addEventListener('mouseup', function() {
  clearTimeout(timerIncomePort);
});
downIncomePort.addEventListener('touchend', function() {
  clearTimeout(timerIncomePort);
});
downIncomePort.addEventListener('mouseleave', function() {
  clearTimeout(timerIncomePort);
});
inputIncomePort.addEventListener('change', function() {
  let value = parseInt(inputIncomePort.value);
  const maxValue = parseInt(inputIncomePort.getAttribute('max'));
  const minValue = parseInt(inputIncomePort.getAttribute('min'));
  if (isNaN(value) || value < minValue) {
    inputIncomePort.value = minValue;
    value = minValue;
  } else if (value > maxValue) {
    inputIncomePort.value = maxValue;
    value = maxValue;
  }
  if (value === minValue) {
    downIncomePort.classList.add('tr-input-number-handler-down-disabled');
  } else {
    downIncomePort.classList.remove('tr-input-number-handler-down-disabled');
  }
  if (value === maxValue) {
    upIncomePort.classList.add('tr-input-number-handler-up-disabled');
  } else {
    upIncomePort.classList.remove('tr-input-number-handler-up-disabled');
  }
});
inputIncomePort.dispatchEvent(new Event('change'));
// Inter Connection Inbound Port
const increaseInterConnectionInboundPort = function() {
  let value = parseInt(inputInterConnectionInboundPort.value);
  const maxValue = parseInt(inputInterConnectionInboundPort.getAttribute('max'));
  const minValue = parseInt(inputInterConnectionInboundPort.getAttribute('min'));
  if (value < maxValue) {
    value++;
    inputInterConnectionInboundPort.value = value;
    if (value === maxValue) {
      upInterConnectionInboundPort.classList.add('tr-input-number-handler-up-disabled');
    }
    if (value > minValue) {
      downInterConnectionInboundPort.classList.remove('tr-input-number-handler-down-disabled');
    }
    timerInterConnectionInboundPort = setTimeout(increaseInterConnectionInboundPort, 100);
  }
};
const decreaseInterConnectionInboundPort = function() {
  let value = parseInt(inputInterConnectionInboundPort.value);
  const minValue = parseInt(inputInterConnectionInboundPort.getAttribute('min'));
  const maxValue = parseInt(inputInterConnectionInboundPort.getAttribute('max'));
  if (value > minValue) {
    value--;
    inputInterConnectionInboundPort.value = value;
    if (value === minValue) {
      downInterConnectionInboundPort.classList.add('tr-input-number-handler-down-disabled');
    }
    if (value < maxValue) {
      upInterConnectionInboundPort.classList.remove('tr-input-number-handler-up-disabled');
    }
    timerInterConnectionInboundPort = setTimeout(decreaseInterConnectionInboundPort, 100);
  }
};
upInterConnectionInboundPort.addEventListener('mousedown', function() {
  clearTimeout(timerInterConnectionInboundPort);
  increaseInterConnectionInboundPort();
});
upInterConnectionInboundPort.addEventListener('touchstart', function() {
  clearTimeout(timerInterConnectionInboundPort);
  increaseInterConnectionInboundPort();
}, {
  passive: true
});
upInterConnectionInboundPort.addEventListener('mouseup', function() {
  clearTimeout(timerInterConnectionInboundPort);
});
upInterConnectionInboundPort.addEventListener('touchend', function() {
  clearTimeout(timerInterConnectionInboundPort);
});
upInterConnectionInboundPort.addEventListener('mouseleave', function() {
  clearTimeout(timerInterConnectionInboundPort);
});
downInterConnectionInboundPort.addEventListener('mousedown', function() {
  clearTimeout(timerInterConnectionInboundPort);
  decreaseInterConnectionInboundPort();
});
downInterConnectionInboundPort.addEventListener('touchstart', function() {
  clearTimeout(timerInterConnectionInboundPort);
  decreaseInterConnectionInboundPort();
}, {
  passive: true
});
downInterConnectionInboundPort.addEventListener('mouseup', function() {
  clearTimeout(timerInterConnectionInboundPort);
});
downInterConnectionInboundPort.addEventListener('touchend', function() {
  clearTimeout(timerInterConnectionInboundPort);
});
downInterConnectionInboundPort.addEventListener('mouseleave', function() {
  clearTimeout(timerInterConnectionInboundPort);
});
inputInterConnectionInboundPort.addEventListener('change', function() {
  let value = parseInt(inputInterConnectionInboundPort.value);
  const maxValue = parseInt(inputInterConnectionInboundPort.getAttribute('max'));
  const minValue = parseInt(inputInterConnectionInboundPort.getAttribute('min'));
  if (isNaN(value) || value < minValue) {
    inputInterConnectionInboundPort.value = minValue;
    value = minValue;
  } else if (value > maxValue) {
    inputInterConnectionInboundPort.value = maxValue;
    value = maxValue;
  }
  if (value === minValue) {
    downInterConnectionInboundPort.classList.add('tr-input-number-handler-down-disabled');
  } else {
    downInterConnectionInboundPort.classList.remove('tr-input-number-handler-down-disabled');
  }
  if (value === maxValue) {
    upInterConnectionInboundPort.classList.add('tr-input-number-handler-up-disabled');
  } else {
    upInterConnectionInboundPort.classList.remove('tr-input-number-handler-up-disabled');
  }
});
inputInterConnectionInboundPort.dispatchEvent(new Event('change'));
// Main Inbound Port
const increaseMainPort = function() {
  let value = parseInt(inputMainPort.value);
  const maxValue = parseInt(inputMainPort.getAttribute('max'));
  const minValue = parseInt(inputMainPort.getAttribute('min'));
  if (value < maxValue) {
    value++;
    inputMainPort.value = value;
    if (value === maxValue) {
      upMainPort.classList.add('tr-input-number-handler-up-disabled');
    }
    if (value > minValue) {
      downMainPort.classList.remove('tr-input-number-handler-down-disabled');
    }
    timerMainPort = setTimeout(increaseMainPort, 100);
  }
};
const decreaseMainPort = function() {
  let value = parseInt(inputMainPort.value);
  const minValue = parseInt(inputMainPort.getAttribute('min'));
  const maxValue = parseInt(inputMainPort.getAttribute('max'));
  if (value > minValue) {
    value--;
    inputMainPort.value = value;
    if (value === minValue) {
      downMainPort.classList.add('tr-input-number-handler-down-disabled');
    }
    if (value < maxValue) {
      upMainPort.classList.remove('tr-input-number-handler-up-disabled');
    }
    timerMainPort = setTimeout(decreaseMainPort, 100);
  }
};
upMainPort.addEventListener('mousedown', function() {
  clearTimeout(timerMainPort);
  increaseMainPort();
});
upMainPort.addEventListener('touchstart', function() {
  clearTimeout(timerMainPort);
  increaseMainPort();
}, {
  passive: true
});
upMainPort.addEventListener('mouseup', function() {
  clearTimeout(timerMainPort);
});
upMainPort.addEventListener('touchend', function() {
  clearTimeout(timerMainPort);
});
upMainPort.addEventListener('mouseleave', function() {
  clearTimeout(timerMainPort);
});
downMainPort.addEventListener('mousedown', function() {
  clearTimeout(timerMainPort);
  decreaseMainPort();
});
downMainPort.addEventListener('touchstart', function() {
  clearTimeout(timerMainPort);
  decreaseMainPort();
}, {
  passive: true
});
downMainPort.addEventListener('mouseup', function() {
  clearTimeout(timerMainPort);
});
downMainPort.addEventListener('touchend', function() {
  clearTimeout(timerMainPort);
});
downMainPort.addEventListener('mouseleave', function() {
  clearTimeout(timerMainPort);
});
inputMainPort.addEventListener('change', function() {
  let value = parseInt(inputMainPort.value);
  const maxValue = parseInt(inputMainPort.getAttribute('max'));
  const minValue = parseInt(inputMainPort.getAttribute('min'));
  if (isNaN(value) || value < minValue) {
    inputMainPort.value = minValue;
    value = minValue;
  } else if (value > maxValue) {
    inputMainPort.value = maxValue;
    value = maxValue;
  }
  if (value === minValue) {
    downMainPort.classList.add('tr-input-number-handler-down-disabled');
  } else {
    downMainPort.classList.remove('tr-input-number-handler-down-disabled');
  }
  if (value === maxValue) {
    upMainPort.classList.add('tr-input-number-handler-up-disabled');
  } else {
    upMainPort.classList.remove('tr-input-number-handler-up-disabled');
  }
});
inputMainPort.dispatchEvent(new Event('change'));