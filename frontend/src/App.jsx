
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
  "Samsun": [41.2867, 36.33],
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
  "Zonguldak": [41.4564, 31.7987]
}
function App() {

  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadMessage, setUploadMessage] = useState('')
  const [validationResult, setValidationResult] = useState(null)
  // Çoklu hata filtresi
  // Boş dizi = tüm hatalar
  const [selectedErrorCodes, setSelectedErrorCodes] = useState([])

  const [revenueData, setRevenueData] = useState([])
  const [topMaterialsData, setTopMaterialsData] = useState([])
  const [ordersByCustomerData, setOrdersByCustomerData] = useState([])
  const [ordersByCityData, setOrdersByCityData] = useState([])

  // Sonuç bölümüne kaydırmak için
  const resultsRef = useRef(null)

  // Tablo sıralama bilgisi
  const [sortConfig, setSortConfig] = useState({
    table: '',
    key: '',
    direction: 'asc'
  })
const topRevenueCustomers = [...revenueData]
  .sort((a, b) => Number(b.revenue) - Number(a.revenue))
  .slice(0, 10)
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

  // --------------------------------
  // DOSYA SEÇME
  // --------------------------------

  function handleFileChange(event) {

    setSelectedFile(event.target.files[0])
    setUploadMessage('')
    setValidationResult(null)
    setSelectedErrorCodes([])

  }

  // --------------------------------
  // DOSYA DOĞRULAMA
  // --------------------------------

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

  // --------------------------------
  // DOĞRULAMA SONUCUNA KAYDIR
  // --------------------------------

  useEffect(() => {

    if (validationResult) {

      resultsRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })

    }

  }, [validationResult])

  // --------------------------------
  // HATA FİLTRESİ
  // --------------------------------

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

  // --------------------------------
  // TABLO SIRALAMA
  // --------------------------------

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

        comparison = numberA - numberB

      } else {

        comparison = String(valueA ?? '').localeCompare(
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

  // --------------------------------
  // RENDER
  // --------------------------------

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

      {/* DOSYA SEÇ */}

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


      {/* SONUÇLAR */}

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


            {/* HATA FİLTRESİ */}

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
                validationResult.error_counts
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


            {/* REDDEDİLEN SATIRLAR */}

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
                    ticks={[250000, 350000, 450000, 550000, 650000, 750000]}
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
          <div className="map-container">
  <MapContainer
    center={[39, 35]}
    zoom={5.5}
    scrollWheelZoom={false}
    style={{ height: '420px', width: '100%' }}
  >
    <TileLayer
      attribution='&copy; OpenStreetMap contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />

    {ordersByCityData.map((row) => {
      const coordinates = cityCoordinates[row.city]

      if (!coordinates) return null

      return (
        <CircleMarker
  key={row.city}
  center={coordinates}
  radius={Math.max(6, Math.min(18, 5 + row.order_count * 0.8))}
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
      <strong>{row.city}</strong>
      <span>{row.order_count} sipariş</span>
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

