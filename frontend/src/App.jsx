import { useState ,useEffect} from "react";
import { QRCodeSVG } from "qrcode.react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { namoid } from "./namoid";

import "./App.css";
const API_URL = import.meta.env.VITE_API_URL;
console.log("API_URL =", API_URL);

function App() {
  const [scannedCode, setScannedCode] = useState("");
  const [view, setView] = useState(null); // add for by default operation so that parent can make pass 
  const [formData, setFormData] = useState({
    childName: "",
    authorizedPerson: "",
    date: "",
    startTime: "",
    endTime: ""
  });


//   useEffect(() => {
//   if (userRole === "guardian") {
//     setView("guardian");
//   }

//   if (userRole === "staff") {
//     setView("staff");
//   }
// }, [userRole]);

  
  useEffect(() => {
  if (view !== "staff") {
    return;
  }

  
  const scanner = new Html5QrcodeScanner(
    "qr-reader",
    {
      fps: 10,
      qrbox: 400
    },
    false
  );

  

  scanner.render(
    (decodedText) => {
      setScannedCode(decodedText);
      setVerificationCode(decodedText);

      scanner.clear();
    },
    (errorMessage) => {
      // Ignore normal scanning errors
    }
  );

  return () => {
    scanner.clear().catch(() => {});
  };
}, [view]);
  const [namoidUser, setNamoidUser] = useState(() => {
  const savedUser = sessionStorage.getItem("namoid_user");

  return savedUser ? JSON.parse(savedUser) : null;
});

const [userRole, setUserRole] = useState(() => {
  return sessionStorage.getItem("user_role") || null;
});

const [showRoleSelection, setShowRoleSelection] = useState(false);
const [staffCode, setStaffCode] = useState("");
  const [createdPass, setCreatedPass] = useState(null);
  const [message, setMessage] = useState("");

  // Staff verification states
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationResult, setVerificationResult] = useState(null);


useEffect(() => {
  if (userRole === "guardian") {
    setView("guardian");
  }

  if (userRole === "staff") {
    setView("staff");
  }

  if (namoidUser && !userRole) {
    setShowRoleSelection(true);
  }
}, [userRole, namoidUser]);  

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value
    });
  };

  const chooseGuardian = () => {
  sessionStorage.setItem("user_role", "guardian");
  setUserRole("guardian");
  setShowRoleSelection(false);
  setView("guardian");
};
const chooseStaff = () => {
  if (staffCode !== "SCHOOL-STAFF-2026") {
    alert("Invalid staff invite code.");
    return;
  }

  sessionStorage.setItem("user_role", "staff");
  setUserRole("staff");
  setShowRoleSelection(false);
  setView("staff");
};

 const handleLogin = async () => {
  try {
    const redirectUri = `${window.location.origin}/auth/callback`;

    const started = await namoid.hostedAuth.start({
      redirectUri,
    });

    sessionStorage.setItem(
      "namoid_transaction",
      JSON.stringify(started.transaction)
    );

    window.location.assign(started.authorizationUrl);
  } catch (error) {
    console.error("NamoID login failed:", error);
    alert("Unable to start NamoID login.");
  }
};
 const handleNamoIDCallback = async () => {
  try {
    const callback = new URL(window.location.href);

    // Don't process a callback if NamoID returned an OAuth error
    const oauthError = callback.searchParams.get("error");

    if (oauthError) {
      throw new Error(
        `NamoID authentication failed: ${oauthError}`
      );
    }

    const raw = sessionStorage.getItem("namoid_transaction");

    // Already processed or no login transaction
    if (!raw) {
      return;
    }

    const transaction = JSON.parse(raw);

    // Prevent the same transaction from being exchanged twice
    const processingKey = `namoid_processing_${transaction.state}`;

    if (sessionStorage.getItem(processingKey)) {
      return;
    }

    sessionStorage.setItem(processingKey, "true");

    if (
      callback.searchParams.get("state") !==
      transaction.state
    ) {
      sessionStorage.removeItem(processingKey);
      sessionStorage.removeItem("namoid_transaction");
      throw new Error("Invalid authorization state");
    }

    const code = callback.searchParams.get("code");

    if (!code) {
      sessionStorage.removeItem(processingKey);
      sessionStorage.removeItem("namoid_transaction");
      throw new Error("Authorization code is missing");
    }

    const tokens = await namoid.hostedAuth.exchangeCode({
      code,
      redirectUri: transaction.redirectUri,
      codeVerifier: transaction.codeVerifier,
    });

    const identity = await namoid.hostedAuth.userInfo(
      tokens.access_token
    );

    console.log("NamoID identity:", identity);
    

    sessionStorage.setItem(
      "namoid_user",
      JSON.stringify(identity)
    );
    const savedRole = sessionStorage.getItem("user_role");

    if (!savedRole) {
      setShowRoleSelection(true);
    }

    // Transaction is no longer needed
    sessionStorage.removeItem("namoid_transaction");
    sessionStorage.removeItem(processingKey);

    // Remove ?code=...&state=... from browser URL
    window.history.replaceState({}, "", "/");

    alert(`Welcome ${identity.email || "user"}!`);
  } catch (error) {
    console.error("NamoID callback failed:", error);

    sessionStorage.removeItem("namoid_transaction");

    alert("NamoID login could not be completed.");
  }
};
  // Create pickup pass
 const handleSubmit = async (event) => {
  event.preventDefault();

  if (!namoidUser) {
    alert("Please sign in with NamoID first.");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/passes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...formData,
        userSub: namoidUser.sub
      })
    });

    const data = await response.json();

    if (response.ok) {
      setCreatedPass(data.pass);
      setMessage("Pickup pass created successfully!");

      setFormData({
        childName: "",
        authorizedPerson: "",
        date: "",
        startTime: "",
        endTime: ""
      });
    } else {
      setMessage("Failed to create pass.");
    }
  } catch (error) {
    console.error(error);
    setMessage("Cannot connect to backend.");
  }
};

  // Verify pickup pass
  const handleVerify = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(`${API_URL}/api/passes/verify/${verificationCode}`);

      const data = await response.json();

      setVerificationResult(data);
    } catch (error) {
      console.error(error);

      setVerificationResult({
        valid: false,
        message: "Cannot connect to backend."
      });
    }
  };

  const handleCompleteHandoff = async () => {
  try {
    const response = await fetch(`${API_URL}/api/passes/complete/${verificationCode}`,
      {
        method: "PATCH"
      }
    );

    const data = await response.json();

    if (response.ok) {
      setVerificationResult({
        valid: false,
        message: "✅ Handoff completed successfully",
        pass: data.pass
      });
    } else {
      setVerificationResult({
        valid: false,
        message: data.message,
        pass: data.pass
      });
    }
  } catch (error) {
    console.error(error);

    setVerificationResult({
      valid: false,
      message: "Cannot connect to backend."
    });
  }
};

const handleCancelPass = async () => {
  try {
    const response = await fetch(`${API_URL}/api/passes/cancel/${createdPass.code}`,
      {
        method: "PATCH"
      }
    );

    const data = await response.json();

    if (response.ok) {
      setCreatedPass(data.pass);
      setMessage("Pickup pass cancelled successfully.");
    } else {
      setMessage(data.message);
    }
  } catch (error) {
    console.error(error);
    setMessage("Cannot connect to backend.");
  }
};

useEffect(() => {
  if (window.location.pathname === "/auth/callback") {
    handleNamoIDCallback();
  }
}, []);
  return (
  <div className="app">

    {/* HEADER */}
    <header className="header">
      <div >
        <h1 className="pass">School Pickup Pass</h1>
      </div>

      <div className="user-info">
        {namoidUser ? (
          <>
            <div>
              Signed in as: <strong>{namoidUser.email}</strong>
            </div>

            <div>
              Role: <strong>{userRole}</strong>
            </div>
          </>
        ) : (
          <button onClick={handleLogin}>
            Sign in with NamoID
          </button>
        )}
      </div>
    </header>

    {/* MAIN */}
    <main className="container">

      {!namoidUser && (
  <div className="card">
    <h2>Welcome</h2>

    <p>
      Create and verify secure school pickup passes.
    </p>

    <button onClick={handleLogin}>
      Sign in with NamoID
    </button>
  </div>
)}

{namoidUser && !userRole && showRoleSelection && (
  <div className="card role-card">
    <h2>Choose Your Role</h2>

    <p>
      Select how you will use School Pickup Pass.
    </p>

    <button onClick={chooseGuardian}>
      👨‍👩‍👧 Continue as Guardian
    </button>

    <hr />

    <h3>School Staff</h3>

    <input
      type="text"
      placeholder="Enter staff invite code"
      value={staffCode}
      onChange={(e) => setStaffCode(e.target.value)}
    />

    <button onClick={chooseStaff}>
      🏫 Continue as Staff
    </button>
  </div>
)}

      {/* ================= GUARDIAN DASHBOARD ================= */}

      {view === "guardian" && userRole === "guardian" && (
        <>
          <div className="dashboard-title">
            <h2>Guardian Dashboard</h2>
            <p>Create and manage your pickup pass.</p>
          </div>

          {/* CREATE PASS */}
          <div className="card">
            <h3>Create Pickup Pass</h3>

            <form onSubmit={handleSubmit}>

              <div className="form-group">
                <label>Child Name</label>

                <input 
                  type="text"
                  name="childName"
                  value={formData.childName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Authorized Person</label>

                <input
                  type="text"
                  name="authorizedPerson"
                  value={formData.authorizedPerson}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-row">

                <div className="form-group">
                  <label>Date</label>

                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Start Time</label>

                  <input
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>End Time</label>

                  <input
                    type="time"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleChange}
                    required
                  />
                </div>

              </div>

              <button type="submit">
                Create Pickup Pass
              </button>

            </form>

            {message && (
              <p>{message}</p>
            )}
          </div>

          {/* CREATED PASS */}
          {createdPass && (
            <div className="card pass-card">

              <h3>Your Pickup Pass</h3>

              <div className="pass-details">

                <p>
                  <strong>Child:</strong>{" "}
                  {createdPass.childName}
                </p>

                <p>
                  <strong>Authorized Person:</strong>{" "}
                  {createdPass.authorizedPerson}
                </p>

                <p>
                  <strong>Date:</strong>{" "}
                  {createdPass.date}
                </p>

                <p>
                  <strong>Pickup Time:</strong>{" "}
                  {createdPass.startTime} -{" "}
                  {createdPass.endTime}
                </p>

                <p>
                  <strong>Pass Code:</strong>{" "}
                  {createdPass.code}
                </p>

                <p>
                  <strong>Status:</strong>{" "}
                  <span className="status">
                    {createdPass.status}
                  </span>
                </p>

              </div>

              <div className="qr-container">
                <QRCodeSVG
                  value={createdPass.code}
                  size={200}
                />
              </div>

              {createdPass.status !== "cancelled" &&
                createdPass.status !== "used" && (
                  <button onClick={handleCancelPass}>
                    Cancel Pickup Pass
                  </button>
                )}

              {/* TIMELINE */}
              <div className="timeline">
                <h3>Pass Timeline</h3>

                {createdPass.events.map((event, index) => (
                  <div
                    className="timeline-item"
                    key={index}
                  >
                    <strong>
                      {event.action}
                    </strong>

                    <p>
                      Performed by:{" "}
                      {namoidUser.email}
                    </p>

                    <small>
                      {new Date(
                        event.timestamp
                      ).toLocaleString()}
                    </small>
                  </div>
                ))}

              </div>

            </div>
          )}
        </>
      )}

      {/* ================= STAFF DASHBOARD ================= */}

      {view === "staff" && userRole === "staff" && (
        <>
          <div className="dashboard-title">
            <h2>Staff Dashboard</h2>
            <p>Verify a pickup pass before completing handoff.</p>
          </div>

          {/* SCANNER */}
          <div className="card">

            <h3>Scan Pickup Pass</h3>

            <div className="scanner">
              <div id="qr-reader"></div>
            </div>

            {scannedCode && (
              <p>
                Scanned Code:{" "}
                <strong>{scannedCode}</strong>
              </p>
            )}

          </div>

          {/* MANUAL VERIFICATION */}
          <div className="card">

            <h3>Verify Pass</h3>

            <form onSubmit={handleVerify}>

              <div className="form-group">

                <label>Pickup Pass Code</label>

                <input
                  type="text"
                  placeholder="Enter pass code"
                  value={verificationCode}
                  onChange={(event) =>
                    setVerificationCode(
                      event.target.value.toUpperCase()
                    )
                  }
                  required
                />

              </div>

              <button type="submit">
                Verify Pass
              </button>

            </form>

          </div>

          {/* VERIFICATION RESULT */}

          {verificationResult && (
            <div
              className={`card ${
                verificationResult.valid
                  ? "result-valid"
                  : "result-invalid"
              }`}
            >

              <h3>
                {verificationResult.valid
                  ? "✅ PASS VALID"
                  : "❌ PASS REFUSED"}
              </h3>

              <p>
                {verificationResult.message}
              </p>

              {verificationResult.pass && (
                <div>

                  <p>
                    <strong>Child:</strong>{" "}
                    {verificationResult.pass.childName}
                  </p>

                  <p>
                    <strong>Authorized Person:</strong>{" "}
                    {verificationResult.pass.authorizedPerson}
                  </p>

                  <p>
                    <strong>Date:</strong>{" "}
                    {verificationResult.pass.date}
                  </p>

                  <p>
                    <strong>Pickup Time:</strong>{" "}
                    {verificationResult.pass.startTime} -{" "}
                    {verificationResult.pass.endTime}
                  </p>

                  <p>
                    <strong>Status:</strong>{" "}
                    <span className="status">
                      {verificationResult.pass.status}
                    </span>
                  </p>

                  {verificationResult.valid &&
                    verificationResult.pass.status !== "used" && (
                      <button onClick={handleCompleteHandoff}>
                        Complete Handoff
                      </button>
                    )}

                </div>
              )}

            </div>
          )}

        </>
      )}

    </main>

  </div>
);
}

export default App;