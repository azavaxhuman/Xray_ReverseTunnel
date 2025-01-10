function copyUUID() {
  const uuidField = document.getElementById("UUID");
  uuidField.select();
  document.execCommand("copy");

  const button = document.querySelector(
    ".uuid-container .copy-button-uuid"
  );
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
    document
      .querySelectorAll(".tab-button")
      .forEach((btn) => btn.classList.remove("active"));
    document
      .querySelectorAll(".tab-content")
      .forEach((content) => content.classList.remove("active"));

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
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(
      Math.floor(Math.random() * characters.length)
    );
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
  const uuid = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(
    /[018]/g,
    (c) =>
      (
        c ^
        (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
      ).toString(16)
  );

  document.getElementById("UUID").value = uuid; // Set the generated UUID


  const sni = document.getElementById("sni").value.trim() || "example.com";
  const port = document.getElementById("port").value || "3030";
  const incomePort =
    document.getElementById("iranIncome").value || "4040";
  const RandomTag = generateRandomString();
  const RandomString = generateRandomString();
  const ip = document.getElementById("domain").value.trim() || "127.0.0.1";
  const MainInbound_port =
    document.getElementById("MainOutbound_port").value || "1080";
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

window.onload = function () {
  setTimeout(function () {
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
  notification.style.right = "3rem"; // Show the notification
  const video_notification = document.getElementById("video-notification");
  notification.classList.add("show"); // Show the notification
};
