
import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts'
import './App.css'


function App() {

  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadMessage, setUploadMessage] = useState('')
  const [validationResult, setValidationResult] = useState(null)
  const [selectedErrorCode, setSelectedErrorCode] = useState('ALL')

  const [revenueData, setRevenueData] = useState([])
  const [topMaterialsData, setTopMaterialsData] = useState([])
  const [ordersByCustomerData, setOrdersByCustomerData] = useState([])
  const [ordersByCityData, setOrdersByCityData] = useState([])


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


    fetch("http://localhost:8000/reports/orders-by-customer")
      .then((response) => response.json())
      .then((data) => {
        setOrdersByCustomerData(data)
      })


    fetch("http://localhost:8000/reports/orders-by-city")
      .then((response) => response.json())
      .then((data) => {
        setOrdersByCityData(data)
      })

  }, [])


  function handleFileChange(event) {

    setSelectedFile(event.target.files[0])

    setUploadMessage('')

    setValidationResult(null)

    setSelectedErrorCode('ALL')
  }


  async function handleFileUpload() {

    if (!selectedFile) {

      setUploadMessage(
        'Lütfen bir CSV dosyası seçin.'
      )

      return
    }


    const formData = new FormData()

    formData.append(
      'file',
      selectedFile
    )


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
    
<div className="welcome-section">

  <h2>
    Siparişlerinizi kolayca kontrol edin
  </h2>

  <p>
    CSV dosyanızı yükleyin, siparişlerinizi doğrulayın
    ve detaylı raporları inceleyin.
  </p>

  <div className="feature-container">

    <div className="feature-box">
      <div className="feature-title">
        ✓ Veri Doğrulama
      </div>

      <div className="feature-text">
        Sipariş satırlarını kontrol edin
      </div>
    </div>


    <div className="feature-box">
      <div className="feature-title">
        ↯ Hata Analizi
      </div>

      <div className="feature-text">
        Reddedilen kayıtları inceleyin
      </div>
    </div>


    <div className="feature-box">
      <div className="feature-title">
        ▦ Raporlama
      </div>

      <div className="feature-text">
        Gelir ve sipariş raporlarını görüntüleyin
      </div>
    </div>

  </div>

</div>



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

        <>


          {/* ============================= */}
          {/* DOĞRULAMA SONUCU */}
          {/* ============================= */}

          <div className="card">

            <h2 className="section-title">
              Doğrulama Sonucu
            </h2>


            <div className="stats-container">

              <div className="stat-box">

                <div className="stat-label">
                  Geçen Satır
                </div>

                <div className="stat-number">
                  {validationResult.clean_count}
                </div>

              </div>


              <div className="stat-box">

                <div className="stat-label">
                  Reddedilen Satır
                </div>

                <div className="stat-number">
                  {validationResult.rejected_count}
                </div>

              </div>

            </div>


            <h3>
              Hata Kodları
            </h3>


            <ul>

              <li
                className={
                  selectedErrorCode === 'ALL'
                    ? 'active-error'
                    : ''
                }
                onClick={() =>
                  setSelectedErrorCode('ALL')
                }
              >
                Tüm Hatalar
              </li>


              {Object.entries(
                validationResult.error_counts
              ).map(([code, count]) => (

                <li
                  key={code}
                  className={
                    selectedErrorCode === code
                      ? 'active-error'
                      : ''
                  }
                  onClick={() =>
                    setSelectedErrorCode(code)
                  }
                >
                  {code}: {count}
                </li>

              ))}

            </ul>


            <h3>
              Reddedilen Satırlar
            </h3>


            <table>

              <thead>

                <tr>

                  <th>
                    Order ID
                  </th>

                  <th>
                    Line No
                  </th>

                  <th>
                    Hata Kodu
                  </th>

                  <th>
                    Hata Mesajı
                  </th>

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

                      <td>
                        {row.order_id}
                      </td>

                      <td>
                        {row.line_no}
                      </td>

                      <td className="error-code">
                        {row.error_code}
                      </td>

                      <td>
                        {row.error_message}
                      </td>

                    </tr>

                  ))}

              </tbody>

            </table>

          </div>



          {/* ============================= */}
          {/* MÜŞTERİ GELİRLERİ */}
          {/* ============================= */}

          <div className="card">

            <h2 className="section-title">
              Müşteri Gelirleri
            </h2>


            <table>

              <thead>

                <tr>

                  <th>
                    Müşteri
                  </th>

                  <th>
                    Gelir
                  </th>

                </tr>

              </thead>


              <tbody>

                {revenueData.map((row, index) => (

                  <tr key={index}>

                    <td>
                      {row.customer_name}
                    </td>

                    <td>

                      {Number(
                        row.revenue
                      ).toLocaleString(
                        'tr-TR',
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        }
                      )} ₺

                    </td>

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

              <XAxis
                dataKey="customer_name"
              />

              <YAxis />


              <Tooltip
                cursor={false}
                formatter={(value) => [

                  `${Number(
                    value
                  ).toLocaleString(
                    'tr-TR',
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    }
                  )} ₺`,

                  'Gelir'

                ]}
              />


              <Bar
                dataKey="revenue"
                fill="#7f1d1d"
                stroke="none"
              />

            </BarChart>

          </div>



          {/* ============================= */}
          {/* EN DEĞERLİ MALZEMELER */}
          {/* ============================= */}

          <div className="card">

            <h2 className="section-title">
              En Değerli Malzemeler
            </h2>


            <table>

              <thead>

                <tr>

                  <th>
                    Malzeme
                  </th>

                  <th>
                    Değer
                  </th>

                </tr>

              </thead>


              <tbody>

                {topMaterialsData.map(
                  (row, index) => (

                    <tr key={index}>

                      <td>
                        {row.material_name}
                      </td>

                      <td>

                        {Number(
                          row.value
                        ).toLocaleString(
                          'tr-TR',
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          }
                        )} ₺

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>



          {/* ============================= */}
          {/* MÜŞTERİ SİPARİŞ ÖZETİ */}
          {/* ============================= */}

          <div className="card">

            <h2 className="section-title">
              Müşteri Sipariş Özeti
            </h2>


            <table>

              <thead>

                <tr>

                  <th>
                    Müşteri
                  </th>

                  <th>
                    Sipariş Sayısı
                  </th>

                </tr>

              </thead>


              <tbody>

                {ordersByCustomerData.map(
                  (row, index) => (

                    <tr key={index}>

                      <td>
                        {row.customer_name}
                      </td>

                      <td>
                        {row.order_count}
                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>



          {/* ============================= */}
          {/* ŞEHİR BAZLI SİPARİŞLER */}
          {/* ============================= */}

          <div className="card">

            <h2 className="section-title">
              Şehir Bazlı Siparişler
            </h2>


            <table>

              <thead>

                <tr>

                  <th>
                    Şehir
                  </th>

                  <th>
                    Sipariş Sayısı
                  </th>

                </tr>

              </thead>


              <tbody>

                {ordersByCityData.map(
                  (row, index) => (

                    <tr key={index}>

                      <td>
                        {row.city}
                      </td>

                      <td>
                        {row.order_count}
                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>


        </>

      )}

    </div>

  )
}


export default App
