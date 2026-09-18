
import { useState, useEffect, useRef } from 'react'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

import './App.css'

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Tooltip as MapTooltip
} from 'react-leaflet'

import 'leaflet/dist/leaflet.css'


const cityCoordinates = {

  "Adana": [37.0004, 35.3220],
  "Adıyaman": [37.7669, 38.2767],
  "Afyonkarahisar": [38.7639, 30.5403],
  "Ağrı": [39.7204, 43.0475],
  "Amasya": [40.6502, 35.8356],
  "Ankara": [39.9234, 32.8530],
  "Antalya": [36.8846, 30.7039],
  "Artvin": [41.1832, 41.8181],
  "Aydın": [37.8570, 27.8410],
  "Balıkesir": [39.6491, 27.8815],
  "Bilecik": [40.1500, 29.9827],
  "Bingöl": [38.8846, 40.4966],
  "Bitlis": [38.4039, 42.1084],
  "Bolu": [40.7405, 31.6082],
  "Burdur": [37.7203, 30.2908],
  "Bursa": [40.1956, 29.0601],
  "Çanakkale": [40.1553, 26.4142],
  "Çankırı": [40.6002, 33.6162],
  "Çorum": [40.5499, 34.9537],
  "Denizli": [37.7828, 29.0966],
  "Diyarbakır": [37.9162, 40.2364],
  "Düzce": [40.8438, 31.1565],
  "Edirne": [41.6771, 26.5557],
  "Elazığ": [38.6810, 39.2264],
  "Erzincan": [39.7500, 39.5000],
  "Erzurum": [39.9043, 41.2679],
  "Eskişehir": [39.7767, 30.5206],
  "Gaziantep": [37.0594, 37.3825],
  "Giresun": [40.9128, 38.3895],
  "Gümüşhane": [40.4603, 39.4814],
  "Hakkari": [37.5744, 43.7408],
  "Hatay": [36.2021, 36.1600],
  "Iğdır": [39.9167, 44.0333],
  "Isparta": [37.7648, 30.5566],
  "İstanbul": [41.0138, 28.9497],
  "İzmir": [38.4127, 27.1384],
  "Kahramanmaraş": [37.5753, 36.9228],
  "Karabük": [41.2000, 32.6333],
  "Karaman": [37.1811, 33.2150],
  "Kars": [40.6013, 43.0975],
  "Kastamonu": [41.3781, 33.7753],
  "Kayseri": [38.7322, 35.4853],
  "Kilis": [36.7184, 37.1212],
  "Kırıkkale": [39.8468, 33.5153],
  "Kırklareli": [41.7355, 27.2250],
  "Kırşehir": [39.1458, 34.1639],
  "Kocaeli": [40.7654, 29.9408],
  "Konya": [37.8714, 32.4846],
  "Kütahya": [39.4167, 29.9833],
  "Malatya": [38.3552, 38.3095],
  "Manisa": [38.6191, 27.4289],
  "Mardin": [37.3212, 40.7245],
  "Mersin": [36.8000, 34.6333],
  "Muğla": [37.2153, 28.3636],
  "Muş": [38.9462, 41.7539],
  "Nevşehir": [38.6244, 34.7239],
  "Niğde": [37.9667, 34.6833],
  "Ordu": [40.9839, 37.8764],
  "Osmaniye": [37.0681, 36.2616],
  "Rize": [41.0201, 40.5234],
  "Sakarya": [40.7731, 30.3948],
  "Samsun": [41.2867, 36.3300],
  "Siirt": [37.9333, 41.9500],
  "Sinop": [42.0268, 35.1625],
  "Sivas": [39.7477, 37.0179],
  "Şanlıurfa": [37.1674, 38.7955],
  "Şırnak": [37.5164, 42.4611],
  "Tekirdağ": [40.9780, 27.5110],
  "Tokat": [40.3167, 36.5500],
  "Trabzon": [41.0015, 39.7178],
  "Tunceli": [39.1079, 39.5401],
  "Uşak": [38.6823, 29.4082],
  "Van": [38.4942, 43.3800],
  "Yalova": [40.6500, 29.2667],
  "Yozgat": [39.8181, 34.8147],
  "Zonguldak": [41.4564, 31.7987],

  "Germany": [51.1657, 10.4515]

}


function App() {

  const [selectedFile, setSelectedFile] = useState(null)

  const [uploadMessage, setUploadMessage] = useState('')

  const [validationResult, setValidationResult] = useState(null)

  const [selectedErrorCodes, setSelectedErrorCodes] = useState([])

  const [selectedWarningCodes, setSelectedWarningCodes] = useState([])

  const [revenueData, setRevenueData] = useState([])

  const [topMaterialsData, setTopMaterialsData] = useState([])

  const [topMaterialsQuantityData, setTopMaterialsQuantityData] = useState([])

  const [ordersByCustomerData, setOrdersByCustomerData] = useState([])

  const [ordersByCityData, setOrdersByCityData] = useState([])

  const [summaryData, setSummaryData] = useState(null)

  const [isGermanFile, setIsGermanFile] = useState(false)

  const resultsRef = useRef(null)

  const [sortConfig, setSortConfig] = useState({
    table: '',
    key: '',
    direction: 'asc'
  })


  function formatCurrency(value) {

    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(value))

  }


  const topRevenueCustomers = [...revenueData]
    .sort(
      (a, b) =>
        Number(b.revenue) - Number(a.revenue)
    )
    .slice(0, 10)


  function loadReports() {

    fetch(
      'http://localhost:8000/reports/revenue-by-customer'
    )
      .then((response) => {

        if (!response.ok) {
          throw new Error('Revenue report error')
        }

        return response.json()

      })
      .then((data) => {

        setRevenueData(
          Array.isArray(data) ? data : []
        )

      })
      .catch(() => {

        setRevenueData([])

      })


    fetch(
      'http://localhost:8000/reports/top-materials-by-value'
    )
      .then((response) => {

        if (!response.ok) {
          throw new Error(
            'Material value report error'
          )
        }

        return response.json()

      })
      .then((data) => {

        setTopMaterialsData(
          Array.isArray(data) ? data : []
        )

      })
      .catch(() => {

        setTopMaterialsData([])

      })


    fetch(
      'http://localhost:8000/reports/top-materials-by-quantity'
    )
      .then((response) => {

        if (!response.ok) {
          throw new Error(
            'Material quantity report error'
          )
        }

        return response.json()

      })
      .then((data) => {

        setTopMaterialsQuantityData(
          Array.isArray(data) ? data : []
        )

      })
      .catch(() => {

        setTopMaterialsQuantityData([])

      })


    fetch(
      'http://localhost:8000/reports/orders-by-customer'
    )
      .then((response) => {

        if (!response.ok) {
          throw new Error('Customer report error')
        }

        return response.json()

      })
      .then((data) => {

        setOrdersByCustomerData(
          Array.isArray(data) ? data : []
        )

      })
      .catch(() => {

        setOrdersByCustomerData([])

      })


    fetch(
      'http://localhost:8000/reports/orders-by-city'
    )
      .then((response) => {

        if (!response.ok) {
          throw new Error('City report error')
        }

        return response.json()

      })
      .then((data) => {

        setOrdersByCityData(
          Array.isArray(data) ? data : []
        )

      })
      .catch(() => {

        setOrdersByCityData([])

      })


    fetch(
      'http://localhost:8000/reports/summary'
    )
      .then((response) => {

        if (!response.ok) {
          throw new Error(
            'Summary endpoint bulunamadı'
          )
        }

        return response.json()

      })
      .then((data) => {

        setSummaryData(data)

      })
      .catch(() => {

        setSummaryData(null)

      })

  }


  useEffect(() => {

    loadReports()

  }, [])


  function handleFileChange(event) {

    const file = event.target.files[0]

    setSelectedFile(file)

    setUploadMessage('')

    setValidationResult(null)

    setSelectedErrorCodes([])

    setSelectedWarningCodes([])

    if (file) {

      setIsGermanFile(
        file.name
          .toLowerCase()
          .includes('orders_de')
      )

    } else {

      setIsGermanFile(false)

    }

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
        'http://localhost:8000/validate',
        {
          method: 'POST',
          body: formData
        }
      )


      const data = await response.json()


      console.log(
        'VALIDATION DATA:',
        data
      )

      console.log(
        'WARNING COUNTS:',
        data.warning_counts
      )


      if (!response.ok) {

        setUploadMessage(
          data.error ||
          'Dosya doğrulanamadı.'
        )

        setValidationResult(null)

        return

      }


      setUploadMessage('')

      setValidationResult(data)

      loadReports()

    } catch (error) {

      setUploadMessage(
        'Backend ile bağlantı kurulamadı.'
      )

      setValidationResult(null)

    }

  }


  useEffect(() => {

    if (validationResult) {

      resultsRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })

    }

  }, [validationResult])


  function toggleErrorCode(code) {

    setSelectedErrorCodes((current) => {

      if (current.includes(code)) {

        return current.filter(
          (item) => item !== code
        )

      }

      return [
        ...current,
        code
      ]

    })

  }


  function selectAllErrors() {

    setSelectedErrorCodes([])

  }


  function toggleWarningCode(code) {

    setSelectedWarningCodes((current) => {

      if (current.includes(code)) {

        return current.filter(
          (item) => item !== code
        )

      }

      return [
        ...current,
        code
      ]

    })

  }


  function selectAllWarnings() {

    setSelectedWarningCodes([])

  }


  function handleSort(table, key) {

    setSortConfig((current) => {

      if (
        current.table === table &&
        current.key === key
      ) {

        return {
          table,
          key,
          direction:
            current.direction === 'asc'
              ? 'desc'
              : 'asc'
        }

      }

      return {
        table,
        key,
        direction: 'asc'
      }

    })

  }


  function getSortedData(data, table) {

    const config = sortConfig

    if (
      config.table !== table ||
      !config.key
    ) {

      return data

    }


    return [...data].sort((a, b) => {

      const valueA = a[config.key]

      const valueB = b[config.key]

      const numberA = Number(valueA)

      const numberB = Number(valueB)

      let comparison


      if (
        !Number.isNaN(numberA) &&
        !Number.isNaN(numberB)
      ) {

        comparison =
          numberA - numberB

      } else {

        comparison =
          String(valueA ?? '').localeCompare(
            String(valueB ?? ''),
            'tr'
          )

      }


      return config.direction === 'asc'
        ? comparison
        : -comparison

    })

  }


  function getSortIcon(table, key) {

    if (
      sortConfig.table !== table ||
      sortConfig.key !== key
    ) {

      return '↕'

    }


    return sortConfig.direction === 'asc'
      ? '↑'
      : '↓'

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
          CSV dosyanızı yükleyin, siparişlerinizi
          doğrulayın ve detaylı raporları inceleyin.
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

        <div
          ref={resultsRef}
          className="results-section"
        >


          {/* DOĞRULAMA SONUCU */}

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


            {/* GENEL ÖZET */}

            {summaryData && (

              <div className="stats-container">

                <div className="stat-box">

                  <div className="stat-label">
                    Temiz Veride Farklı Müşteri
                  </div>

                  <div className="stat-number">

                    {summaryData.distinct_customers ?? 0}

                    {' / '}

                    {summaryData.total_customers ?? 0}

                  </div>

                </div>


                <div className="stat-box">

                  <div className="stat-label">
                    Temiz Veride Farklı Malzeme
                  </div>

                  <div className="stat-number">

                    {summaryData.distinct_materials ?? 0}

                    {' / '}

                    {summaryData.total_materials ?? 0}

                  </div>

                </div>


                <div className="stat-box">

                  <div className="stat-label">
                    Temiz Veri Toplam Geliri
                  </div>

                  <div className="stat-number">

                    {formatCurrency(
                      summaryData.total_clean_revenue ?? 0
                    )}

                  </div>

                </div>

              </div>

            )}


            {/* UYARI FİLTRESİ */}

            <h3>
              Uyarılar
            </h3>


            <ul>

              <li
                className={
                  selectedWarningCodes.length === 0
                    ? 'active-error'
                    : ''
                }
                onClick={selectAllWarnings}
              >
                Tüm Uyarılar
              </li>


              <li
                className={
                  selectedWarningCodes.includes('W001')
                    ? 'active-error'
                    : ''
                }
                onClick={() =>
                  toggleWarningCode('W001')
                }
              >
                W001: {
                  validationResult.warning_counts?.W001 ?? 0
                }
              </li>


              <li
                className={
                  selectedWarningCodes.includes('W002')
                    ? 'active-error'
                    : ''
                }
                onClick={() =>
                  toggleWarningCode('W002')
                }
              >
                W002: {
                  validationResult.warning_counts?.W002 ?? 0
                }
              </li>

            </ul>


            {/* W001 DETAYLARI */}

            {(selectedWarningCodes.length === 0 ||
              selectedWarningCodes.includes('W001')) &&

              validationResult.warning_details?.length > 0 && (

                <table>

                  <thead>

                    <tr>

                      <th>Uyarı</th>
                      <th>Müşteri</th>
                      <th>Sipariş</th>
                      <th>Satır</th>
                      <th>Malzeme</th>
                      <th>Liste Fiyatı</th>
                      <th>Gerçek Fiyat</th>
                      <th>Açıklama</th>

                    </tr>

                  </thead>


                  <tbody>

                    {validationResult.warning_details.map(
                      (warning, index) => (

                        <tr key={index}>

                          <td>
                            {warning.warning_code}
                          </td>

                          <td>
                            {warning.customer_id}
                          </td>

                          <td>
                            {warning.order_id}
                          </td>

                          <td>
                            {warning.line_no}
                          </td>

                          <td>
                            {warning.material_code}
                          </td>

                          <td>
                            {formatCurrency(
                              warning.list_price
                            )}
                          </td>

                          <td>
                            {formatCurrency(
                              warning.actual_price
                            )}
                          </td>

                          <td>
                            {warning.warning_message}
                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              )}


            {/* W002 DETAYLARI */}

            {(selectedWarningCodes.length === 0 ||
              selectedWarningCodes.includes('W002')) &&

              validationResult.warning_customers?.length > 0 && (

                <table>

                  <thead>

                    <tr>

                      <th>Uyarı</th>
                      <th>Müşteri</th>
                      <th>Açıklama</th>
                      <th>Toplam Tutar</th>
                      <th>Kredi Limiti</th>

                    </tr>

                  </thead>


                  <tbody>

                    {validationResult.warning_customers.map(
                      (warning, index) => (

                        <tr key={index}>

                          <td>
                            {warning.warning_code}
                          </td>

                          <td>
                            {warning.customer_id}
                          </td>

                          <td>
                            {warning.warning_message}
                          </td>

                          <td>
                            {formatCurrency(
                              warning.total
                            )}
                          </td>

                          <td>
                            {formatCurrency(
                              warning.credit_limit
                            )}
                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              )}


            {/* HATA FİLTRESİ - SADECE TÜRK DOSYASI */}

            {!isGermanFile && (

              <>

                <h3>
                  Hata Kodları
                </h3>


                <ul>

                  <li
                    className={
                      selectedErrorCodes.length === 0
                        ? 'active-error'
                        : ''
                    }
                    onClick={selectAllErrors}
                  >
                    Tüm Hatalar
                  </li>


                  {Object.entries(
                    validationResult.error_counts || {}
                  ).map(([code, count]) => (

                    <li
                      key={code}
                      className={
                        selectedErrorCodes.includes(code)
                          ? 'active-error'
                          : ''
                      }
                      onClick={() =>
                        toggleErrorCode(code)
                      }
                    >
                      {code}: {count}
                    </li>

                  ))}

                </ul>

              </>

            )}


            {/* REDDEDİLEN SATIRLAR - SADECE TÜRK DOSYASI */}

            {!isGermanFile && (

              <>

                <h3>
                  Reddedilen Satırlar
                </h3>


                <table>

                  <thead>

                    <tr>

                      <th
                        onClick={() =>
                          handleSort(
                            'rejected',
                            'order_id'
                          )
                        }
                        style={{
                          cursor: 'pointer'
                        }}
                      >
                        Order ID{' '}
                        {getSortIcon(
                          'rejected',
                          'order_id'
                        )}
                      </th>


                      <th
                        onClick={() =>
                          handleSort(
                            'rejected',
                            'line_no'
                          )
                        }
                        style={{
                          cursor: 'pointer'
                        }}
                      >
                        Line No{' '}
                        {getSortIcon(
                          'rejected',
                          'line_no'
                        )}
                      </th>


                      <th
                        onClick={() =>
                          handleSort(
                            'rejected',
                            'error_code'
                          )
                        }
                        style={{
                          cursor: 'pointer'
                        }}
                      >
                        Hata Kodu{' '}
                        {getSortIcon(
                          'rejected',
                          'error_code'
                        )}
                      </th>


                      <th
                        onClick={() =>
                          handleSort(
                            'rejected',
                            'error_message'
                          )
                        }
                        style={{
                          cursor: 'pointer'
                        }}
                      >
                        Hata Mesajı{' '}
                        {getSortIcon(
                          'rejected',
                          'error_message'
                        )}
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {getSortedData(

                      validationResult.rejected_rows.filter(
                        (row) =>
                          selectedErrorCodes.length === 0 ||
                          selectedErrorCodes.includes(
                            row.error_code
                          )
                      ),

                      'rejected'

                    ).map((row, index) => (

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

              </>

            )}

          </div>


          {/* MÜŞTERİ GELİRLERİ */}

          <div className="card">

            <h2 className="section-title">
              Müşteri Gelirleri
            </h2>


            <table>

              <thead>

                <tr>

                  <th
                    onClick={() =>
                      handleSort(
                        'revenue',
                        'customer_name'
                      )
                    }
                    style={{
                      cursor: 'pointer'
                    }}
                  >
                    Müşteri{' '}
                    {getSortIcon(
                      'revenue',
                      'customer_name'
                    )}
                  </th>


                  <th
                    onClick={() =>
                      handleSort(
                        'revenue',
                        'revenue'
                      )
                    }
                    style={{
                      cursor: 'pointer'
                    }}
                  >
                    Gelir{' '}
                    {getSortIcon(
                      'revenue',
                      'revenue'
                    )}
                  </th>

                </tr>

              </thead>


              <tbody>

                {getSortedData(
                  revenueData,
                  'revenue'
                ).map((row, index) => (

                  <tr key={index}>

                    <td>
                      {row.customer_name}
                    </td>

                    <td>
                      {formatCurrency(
                        row.revenue
                      )}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>


            <h3 className="chart-title">
              Müşteri Gelir Grafiği
            </h3>


            <div className="chart-container">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <BarChart
                  layout="vertical"
                  data={topRevenueCustomers}
                  margin={{
                    top: 10,
                    right: 30,
                    left: 20,
                    bottom: 10
                  }}
                >

                  <XAxis
                    type="number"
                    domain={[0, 750000]}
                    ticks={[
                      250000,
                      350000,
                      450000,
                      550000,
                      650000,
                      750000
                    ]}
                    tickFormatter={(value) =>
                      value.toLocaleString('tr-TR')
                    }
                  />


                  <YAxis
                    type="category"
                    dataKey="customer_name"
                    width={190}
                    tick={{
                      fontFamily: 'Cormorant'
                    }}
                  />


                  <Tooltip
                    cursor={false}
                    formatter={(value) => [
                      formatCurrency(value),
                      'Gelir'
                    ]}
                  />


                  <Bar
                    dataKey="revenue"
                    fill="#7f1d1d"
                  />

                </BarChart>

              </ResponsiveContainer>

            </div>

          </div>


          {/* EN DEĞERLİ MALZEMELER */}

          <div className="card">

            <h2 className="section-title">
              En Değerli Malzemeler
            </h2>


            <table>

              <thead>

                <tr>

                  <th
                    onClick={() =>
                      handleSort(
                        'materials',
                        'material_name'
                      )
                    }
                    style={{
                      cursor: 'pointer'
                    }}
                  >
                    Malzeme{' '}
                    {getSortIcon(
                      'materials',
                      'material_name'
                    )}
                  </th>


                  <th
                    onClick={() =>
                      handleSort(
                        'materials',
                        'value'
                      )
                    }
                    style={{
                      cursor: 'pointer'
                    }}
                  >
                    Değer{' '}
                    {getSortIcon(
                      'materials',
                      'value'
                    )}
                  </th>

                </tr>

              </thead>


              <tbody>

                {getSortedData(
                  topMaterialsData,
                  'materials'
                ).map((row, index) => (

                  <tr key={index}>

                    <td>
                      {row.material_name}
                    </td>

                    <td>
                      {formatCurrency(
                        row.value
                      )}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>


          {/* ADET SAYISINA GÖRE İLK 10 MALZEME */}

          <div className="card">

            <h2 className="section-title">
              Adet Sayısına Göre İlk 10 Malzeme
            </h2>


            <table>

              <thead>

                <tr>

                  <th
                    onClick={() =>
                      handleSort(
                        'topMaterialsQuantity',
                        'material_name'
                      )
                    }
                    style={{
                      cursor: 'pointer'
                    }}
                  >
                    Malzeme{' '}
                    {getSortIcon(
                      'topMaterialsQuantity',
                      'material_name'
                    )}
                  </th>


                  <th
                    onClick={() =>
                      handleSort(
                        'topMaterialsQuantity',
                        'quantity'
                      )
                    }
                    style={{
                      cursor: 'pointer'
                    }}
                  >
                    Toplam Miktar{' '}
                    {getSortIcon(
                      'topMaterialsQuantity',
                      'quantity'
                    )}
                  </th>

                </tr>

              </thead>


              <tbody>

                {getSortedData(
                  topMaterialsQuantityData,
                  'topMaterialsQuantity'
                ).map((row, index) => (

                  <tr key={index}>

                    <td>
                      {row.material_name}
                    </td>

                    <td>
                      {Number(
                        row.quantity
                      ).toLocaleString('tr-TR')}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>


          {/* MÜŞTERİ SİPARİŞ ÖZETİ */}

          <div className="card">

            <h2 className="section-title">
              Müşteri Sipariş Özeti
            </h2>


            <table>

              <thead>

                <tr>

                  <th
                    onClick={() =>
                      handleSort(
                        'ordersCustomer',
                        'customer_name'
                      )
                    }
                    style={{
                      cursor: 'pointer'
                    }}
                  >
                    Müşteri{' '}
                    {getSortIcon(
                      'ordersCustomer',
                      'customer_name'
                    )}
                  </th>


                  <th
                    onClick={() =>
                      handleSort(
                        'ordersCustomer',
                        'order_count'
                      )
                    }
                    style={{
                      cursor: 'pointer'
                    }}
                  >
                    Sipariş Sayısı{' '}
                    {getSortIcon(
                      'ordersCustomer',
                      'order_count'
                    )}
                  </th>

                </tr>

              </thead>


              <tbody>

                {getSortedData(
                  ordersByCustomerData,
                  'ordersCustomer'
                ).map((row, index) => (

                  <tr key={index}>

                    <td>
                      {row.customer_name}
                    </td>

                    <td>
                      {row.order_count}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>


          {/* ŞEHİR BAZLI SİPARİŞLER */}

          <div className="card">

            <h2 className="section-title">
              Şehir Bazlı Siparişler
            </h2>


            <table>

              <thead>

                <tr>

                  <th
                    onClick={() =>
                      handleSort(
                        'city',
                        'city'
                      )
                    }
                    style={{
                      cursor: 'pointer'
                    }}
                  >
                    Şehir{' '}
                    {getSortIcon(
                      'city',
                      'city'
                    )}
                  </th>


                  <th
                    onClick={() =>
                      handleSort(
                        'city',
                        'order_count'
                      )
                    }
                    style={{
                      cursor: 'pointer'
                    }}
                  >
                    Sipariş Sayısı{' '}
                    {getSortIcon(
                      'city',
                      'order_count'
                    )}
                  </th>

                </tr>

              </thead>


              <tbody>

                {getSortedData(
                  ordersByCityData,
                  'city'
                ).map((row, index) => (

                  <tr key={index}>

                    <td>
                      {row.city}
                    </td>

                    <td>
                      {row.order_count}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>


          {/* HARİTA */}

          <div className="map-container">

            <MapContainer

              key={
                isGermanFile
                  ? 'germany-map'
                  : 'turkey-map'
              }

              center={
                isGermanFile
                  ? cityCoordinates["Germany"]
                  : [39, 35]
              }

              zoom={
                isGermanFile
                  ? 5
                  : 5.5
              }

              scrollWheelZoom={false}

              style={{
                height: '420px',
                width: '100%'
              }}

            >

              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />


              {ordersByCityData.map((row) => {

                const coordinates =
                  cityCoordinates[row.city]

                if (!coordinates) {
                  return null
                }


                return (

                  <CircleMarker
                    key={row.city}
                    center={coordinates}

                    radius={
                      Math.max(
                        6,
                        Math.min(
                          18,
                          5 +
                          Number(
                            row.order_count
                          ) * 0.8
                        )
                      )
                    }

                    pathOptions={{
                      fillColor: '#7f1d1d',
                      fillOpacity: 0.65,
                      color: '#5f1515',
                      weight: 2
                    }}

                  >

                    <MapTooltip
                      permanent
                      direction="top"
                      offset={[0, -5]}
                      className="city-label"
                    >
                      {row.city}
                    </MapTooltip>


                    <Popup>

                      <div className="city-popup">

                        <strong>
                          {row.city}
                        </strong>

                        <span>
                          {row.order_count} sipariş
                        </span>

                      </div>

                    </Popup>

                  </CircleMarker>

                )

              })}

            </MapContainer>

          </div>

        </div>

      )}

    </div>

  )

}


export default App
