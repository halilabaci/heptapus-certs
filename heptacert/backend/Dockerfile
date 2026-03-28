FROM python:3.12-slim

WORKDIR /app

# Avoid apt cache usage on low-disk hosts: download only required font files.
RUN mkdir -p /usr/share/fonts/truetype/dejavu
ADD https://github.com/dejavu-fonts/dejavu-fonts/raw/version_2_37/ttf/DejaVuSans.ttf /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
ADD https://github.com/dejavu-fonts/dejavu-fonts/raw/version_2_37/ttf/DejaVuSans-Bold.ttf /usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
ADD https://github.com/dejavu-fonts/dejavu-fonts/raw/version_2_37/ttf/DejaVuSans-Oblique.ttf /usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf
ADD https://github.com/dejavu-fonts/dejavu-fonts/raw/version_2_37/ttf/DejaVuSans-BoldOblique.ttf /usr/share/fonts/truetype/dejavu/DejaVuSans-BoldOblique.ttf

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install \
    --index-url https://pypi.org/simple \
    --default-timeout=300 \
    --retries 10 \
    --no-cache-dir \
    -r requirements.txt

COPY src ./src
COPY alembic ./alembic
COPY tests ./tests
COPY alembic.ini .
COPY pytest.ini .

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]