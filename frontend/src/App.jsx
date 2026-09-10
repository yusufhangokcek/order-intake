import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import './App.css'

function App() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadMessage, setUploadMessage] = useState('')
  const [validationResult, setValidationResult] = useState(null)
  const [selectedErrorCode, setSelectedErrorCode] = useState('ALL')
  const [revenueData, setRevenueData] = useState([])
  const [topMaterialsData, setTopMaterialsData] = useState([])

  useEffect(() => {
    fetch("http://localhost:8000/reports/revenue-by-customer")
      .then((response) => response.json())
      .then((data) => {
        setRevenueData(data)
      })

    fetch("http://localhost:8000/reports/top-materials-by-value")
      .then((response) => response.json())
      .then((data) => {
        setTopMaterialsData(data)
      })
  }, [])

  function handleFileChange(event) {
    setSelectedFile(event.target.files[0])
    setUploadMessage('')
    setValidationResult(null)
  }

  async function handleFileUpload() {
    if (!selectedFile) {
      setUploadMessage('Lütfen bir CSV dosyası seçin.')
      return
    }

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const response = await fetch(
        "http://localhost:8000/validate",
        {
          method: 'POST',
          body: formData
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setUploadMessage(
          data.error || 'Dosya doğrulanamadı.'
        )
        setValidationResult(null)
        return
      }

      setUploadMessage('')
      setValidationResult(data)

    } catch (error) {
      setUploadMessage(
        'Backend ile bağlantı kurulamadı.'
      )
      setValidationResult(null)
    }
  }

  return (
    <div className="app-container">

      <h1 className="page-title">
        Order Intake
      </h1>

      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
      />

      {selectedFile && (
        <p className="selected-file">
          Seçilen dosya: {selectedFile.name}
        </p>
      )}

      <p className="upload-message">
        {uploadMessage}
      </p>

      <button onClick={handleFileUpload}>
        Doğrula
      </button>

      {validationResult && (
        <div className="card">

          <h2 className="section-title">
            Doğrulama Sonucu
          </h2>

          <p>
            Geçen satır: {validationResult.clean_count}
          </p>

          <p>
            Reddedilen satır: {validationResult.rejected_count}
          </p>

          <h3>
            Hata Kodları
          </h3>

          <ul>
            {Object.entries(
              validationResult.error_counts
            ).map(([code, count]) => (
              <li key={code}>
                {code}: {count}
              </li>
            ))}
          </ul>

          <select
            value={selectedErrorCode}
            onChange={(event) =>
              setSelectedErrorCode(event.target.value)
            }
          >
            <option value="ALL">
              Tüm Hatalar
            </option>

            {Object.keys(
              validationResult.error_counts
            ).map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>

          <h3>
            Reddedilen Satırlar
          </h3>

          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Line No</th>
                <th>Hata Kodu</th>
                <th>Hata Mesajı</th>
              </tr>
            </thead>

            <tbody>
              {validationResult.rejected_rows
                .filter(
                  (row) =>
                    selectedErrorCode === 'ALL' ||
                    row.error_code === selectedErrorCode
                )
                .map((row, index) => (
                  <tr key={index}>
                    <td>{row.order_id}</td>
                    <td>{row.line_no}</td>
                    <td className="error-code">
                      {row.error_code}
                    </td>
                    <td>{row.error_message}</td>
                  </tr>
                ))}
            </tbody>
          </table>

        </div>
      )}

      <div className="card">

        <h2 className="section-title">
          Müşteri Gelirleri
        </h2>

        <table>
          <thead>
            <tr>
              <th>Müşteri</th>
              <th>Gelir</th>
            </tr>
          </thead>

          <tbody>
            {revenueData.map((row, index) => (
              <tr key={index}>
                <td>{row.customer_id}</td>
                <td>{row.revenue}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 className="chart-title">
          Müşteri Gelir Grafiği
        </h3>

        <BarChart
          width={600}
          height={300}
          data={revenueData}
        >
          <XAxis dataKey="customer_id" />
          <YAxis />
          <Tooltip />

          <Bar
            dataKey="revenue"
            fill="#7f1d1d"
          />
        </BarChart>

      </div>

      <div className="card">

        <h2 className="section-title">
          En Değerli Malzemeler
        </h2>

        <table>
          <thead>
            <tr>
              <th>Malzeme</th>
              <th>Değer</th>
            </tr>
          </thead>

          <tbody>
            {topMaterialsData.map((row, index) => (
              <tr key={index}>
                <td>{row.material_code}</td>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>

      </div>

    </div>
  )
}

export default App